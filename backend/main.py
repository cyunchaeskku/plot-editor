import json
import logging
import os
import sys
import traceback

# Lambda 환경에서 Linux 호환 패키지를 사용 (pip --platform으로 빌드된 manylinux 바이너리)
_lambda_pkg = os.path.join(os.path.dirname(__file__), "lambda_package")
if os.path.isdir(_lambda_pkg) and _lambda_pkg not in sys.path:
    sys.path.insert(0, _lambda_pkg)

from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import boto3
import jwt as pyjwt
from authlib.integrations.starlette_client import OAuth
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_env(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise ValueError(f"환경변수 {key} 가 .env 에 설정되지 않았습니다.")
    return val


_JWT_SECRET = _require_env("SECRET_KEY")
_JWT_ALGORITHM = "HS256"
_JWT_EXPIRE_DAYS = 30


def _require_login(request: Request) -> str:
    """JWT Bearer 토큰에서 sub 반환, 없거나 만료 시 401"""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    token = auth[7:]
    try:
        payload = pyjwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return payload["sub"]


def _extract_dialogues(nodes: list, target_name: str) -> list[str]:
    """Recursively walk TipTap JSON nodes and collect dialogue text for target_name."""
    result = []
    for node in nodes:
        if node.get("type") == "dialogue" and node.get("attrs", {}).get("characterName") == target_name:
            texts = []
            for child in node.get("content") or []:
                for inline in child.get("content") or []:
                    if inline.get("type") == "text":
                        texts.append(inline.get("text", ""))
            text = "".join(texts).strip()
            if text:
                result.append(text)
        elif node.get("content"):
            result.extend(_extract_dialogues(node["content"], target_name))
    return result


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Plot Editor Auth")


from fastapi import Request as _Request
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: _Request, exc: Exception):
    logger.error(
        "Unhandled exception: %s %s\n%s",
        request.method,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(status_code=500, content={"detail": str(exc)})


_allowed_origins = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:1420,http://localhost:5173,https://plot-editor.vercel.app",
).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=_require_env("SECRET_KEY"),
    same_site="none",
    https_only=True,
)

# ---------------------------------------------------------------------------
# Cognito OIDC client
# ---------------------------------------------------------------------------

_region = _require_env("COGNITO_REGION")
_pool_id = _require_env("COGNITO_USER_POOL_ID")
_metadata_url = (
    f"https://cognito-idp.{_region}.amazonaws.com/{_pool_id}"
    "/.well-known/openid-configuration"
)

oauth = OAuth()
oauth.register(
    name="oidc",
    client_id=_require_env("COGNITO_CLIENT_ID"),
    client_secret=_require_env("COGNITO_CLIENT_SECRET"),
    server_metadata_url=_metadata_url,
    client_kwargs={"scope": "phone openid email"},
)

# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------

_dynamodb = boto3.resource("dynamodb", region_name=_region)
_users_table      = _dynamodb.Table("users")
_works_table      = _dynamodb.Table("works")
_episodes_table   = _dynamodb.Table("episodes")
_plots_table      = _dynamodb.Table("plots")
_characters_table = _dynamodb.Table("characters")
_relations_table  = _dynamodb.Table("character_relations")
_graph_table      = _dynamodb.Table("graph_layouts")

_s3 = boto3.client("s3", region_name=_region)
_S3_BUCKET = os.getenv("S3_BUCKET", "")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    user = request.session.get("user")
    if user:
        email = user.get("email", "unknown")
        return HTMLResponse(
            f"<p>Hello, <strong>{email}</strong>.</p>"
            '<p><a href="/logout">Logout</a></p>'
        )
    return HTMLResponse('<p>Welcome! Please <a href="/login">Login with Google</a>.</p>')


@app.get("/login")
async def login(request: Request) -> RedirectResponse:
    redirect_uri = _require_env("REDIRECT_URI")
    return await oauth.oidc.authorize_redirect(request, redirect_uri)


@app.get("/authorize")
async def authorize(request: Request) -> RedirectResponse:
    token = await oauth.oidc.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        raise HTTPException(status_code=400, detail="Cognito에서 유저 정보를 받지 못했습니다.")
    # 신규 사용자이면 DynamoDB에 등록 (기존 사용자는 무시)
    try:
        _users_table.put_item(
            Item={
                "sub": userinfo["sub"],
                "email": userinfo.get("email", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            ConditionExpression="attribute_not_exists(#s)",
            ExpressionAttributeNames={"#s": "sub"},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] != "ConditionalCheckFailedException":
            raise  # 기존 사용자면 조용히 무시, 다른 에러는 전파

    # JWT 발급 (30일 만료)
    jwt_payload = {
        "sub": userinfo["sub"],
        "email": userinfo.get("email", ""),
        "exp": datetime.now(timezone.utc) + timedelta(days=_JWT_EXPIRE_DAYS),
    }
    jwt_token = pyjwt.encode(jwt_payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)

    frontend_url = os.getenv("FRONTEND_URL", "/")
    return RedirectResponse(url=f"{frontend_url}#token={jwt_token}")


@app.get("/me")
async def me(request: Request):
    sub = _require_login(request)
    auth = request.headers.get("Authorization", "")
    token = auth[7:]
    try:
        payload = pyjwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return {"sub": sub, "email": payload.get("email", "")}


# ── Works ──────────────────────────────────────────────────────────────────

@app.get("/works")
async def get_works(request: Request):
    sub = _require_login(request)
    res = _works_table.scan(
        FilterExpression="user_sub = :s",
        ExpressionAttributeValues={":s": sub},
    )
    return res.get("Items", [])


@app.post("/works")
async def create_work(request: Request):
    sub = _require_login(request)
    body = await request.json()
    work_id = body["work_id"]
    _works_table.put_item(Item={
        "work_id":      f"{sub}#{work_id}",
        "user_sub":     sub,
        "local_id":     work_id,
        "title":        body.get("title", ""),
        "type":         body.get("type", "plot"),
        "planning_doc": body.get("planning_doc", ""),
        "created_at":   datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@app.put("/works/{work_id}")
async def update_work(work_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    _works_table.update_item(
        Key={"work_id": f"{sub}#{work_id}"},
        UpdateExpression="SET title = :t, #tp = :tp, planning_doc = :pd",
        ExpressionAttributeNames={"#tp": "type"},
        ExpressionAttributeValues={
            ":t": body.get("title", ""),
            ":tp": body.get("type", "plot"),
            ":pd": body.get("planning_doc", ""),
        },
    )
    return {"ok": True}


@app.delete("/works/{work_id}")
async def delete_work(work_id: int, request: Request):
    sub = _require_login(request)
    _works_table.delete_item(Key={"work_id": f"{sub}#{work_id}"})
    return {"ok": True}


# ── Episodes ───────────────────────────────────────────────────────────────

@app.get("/works/{work_id}/episodes")
async def get_episodes(work_id: int, request: Request):
    sub = _require_login(request)
    res = _episodes_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    items = sorted(res.get("Items", []), key=lambda x: x.get("order_index", 0))
    return items


@app.post("/works/{work_id}/episodes")
async def create_episode(work_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    ep_id = body["episode_id"]
    _episodes_table.put_item(Item={
        "episode_id":  f"{sub}#{ep_id}",
        "user_sub":    sub,
        "local_id":    ep_id,
        "work_id":     work_id,
        "title":       body.get("title", ""),
        "order_index": body.get("order_index", 0),
    })
    return {"ok": True}


@app.put("/episodes/{episode_id}")
async def update_episode(episode_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    _episodes_table.update_item(
        Key={"episode_id": f"{sub}#{episode_id}"},
        UpdateExpression="SET title = :t, order_index = :o",
        ExpressionAttributeValues={":t": body.get("title", ""), ":o": body.get("order_index", 0)},
    )
    return {"ok": True}


@app.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: int, request: Request):
    sub = _require_login(request)
    _episodes_table.delete_item(Key={"episode_id": f"{sub}#{episode_id}"})
    return {"ok": True}


# ── Plots ──────────────────────────────────────────────────────────────────

@app.get("/episodes/{episode_id}/plots")
async def get_plots(episode_id: int, request: Request):
    sub = _require_login(request)
    res = _plots_table.scan(
        FilterExpression="user_sub = :s AND episode_id = :e",
        ExpressionAttributeValues={":s": sub, ":e": episode_id},
    )
    items = sorted(res.get("Items", []), key=lambda x: x.get("order_index", 0))
    return items


@app.post("/episodes/{episode_id}/plots")
async def create_plot(episode_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    plot_id = body["plot_id"]
    _plots_table.put_item(Item={
        "plot_id":     f"{sub}#{plot_id}",
        "user_sub":    sub,
        "local_id":    plot_id,
        "episode_id":  episode_id,
        "title":       body.get("title", ""),
        "order_index": body.get("order_index", 0),
        "updated_at":  datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@app.put("/plots/{plot_id}")
async def update_plot_meta(plot_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    _plots_table.update_item(
        Key={"plot_id": f"{sub}#{plot_id}"},
        UpdateExpression="SET title = :t, order_index = :o",
        ExpressionAttributeValues={":t": body.get("title", ""), ":o": body.get("order_index", 0)},
    )
    return {"ok": True}


@app.delete("/plots/{plot_id}")
async def delete_plot(plot_id: int, request: Request):
    sub = _require_login(request)
    s3_key = f"plots/{sub}/{plot_id}.json"
    try:
        _s3.delete_object(Bucket=_S3_BUCKET, Key=s3_key)
    except Exception:
        logger.warning("S3 delete failed for key %s:\n%s", s3_key, traceback.format_exc())
    _plots_table.delete_item(Key={"plot_id": f"{sub}#{plot_id}"})
    return {"ok": True}


@app.put("/plots/{plot_id}/content")
async def save_plot_content(plot_id: int, request: Request):
    sub = _require_login(request)
    body = await request.body()
    s3_key = f"plots/{sub}/{plot_id}.json"
    _s3.put_object(Bucket=_S3_BUCKET, Key=s3_key, Body=body, ContentType="application/json")
    _plots_table.update_item(
        Key={"plot_id": f"{sub}#{plot_id}"},
        UpdateExpression="SET content_s3_key = :k, updated_at = :t",
        ExpressionAttributeValues={":k": s3_key, ":t": datetime.now(timezone.utc).isoformat()},
    )
    return {"ok": True}


@app.get("/plots/{plot_id}/content")
async def get_plot_content(plot_id: int, request: Request):
    from fastapi.responses import Response
    sub = _require_login(request)
    s3_key = f"plots/{sub}/{plot_id}.json"
    try:
        obj = _s3.get_object(Bucket=_S3_BUCKET, Key=s3_key)
        return Response(content=obj["Body"].read(), media_type="application/json")
    except ClientError as e:
        if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return Response(content=b"{}", media_type="application/json")
        logger.error("S3 get failed for key %s:\n%s", s3_key, traceback.format_exc())
        raise


# ── Characters ─────────────────────────────────────────────────────────────

@app.get("/works/{work_id}/characters")
async def get_characters(work_id: int, request: Request):
    sub = _require_login(request)
    res = _characters_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    return res.get("Items", [])


@app.post("/works/{work_id}/characters")
async def create_character(work_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    char_id = body["character_id"]
    _characters_table.put_item(Item={
        "character_id": f"{sub}#{char_id}",
        "user_sub":     sub,
        "local_id":     char_id,
        "work_id":      work_id,
        "name":         body.get("name", ""),
        "color":        body.get("color", ""),
        "properties":   body.get("properties", "{}"),
        "memo":         body.get("memo", ""),
    })
    return {"ok": True}


@app.put("/characters/{character_id}")
async def update_character(character_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    _characters_table.update_item(
        Key={"character_id": f"{sub}#{character_id}"},
        UpdateExpression="SET #n = :n, color = :c, properties = :p, memo = :m, ai_summary = :a",
        ExpressionAttributeNames={"#n": "name"},
        ExpressionAttributeValues={
            ":n": body.get("name", ""), ":c": body.get("color", ""),
            ":p": body.get("properties", "{}"), ":m": body.get("memo", ""),
            ":a": body.get("ai_summary", ""),
        },
    )
    return {"ok": True}


@app.delete("/characters/{character_id}")
async def delete_character(character_id: int, request: Request):
    sub = _require_login(request)
    _characters_table.delete_item(Key={"character_id": f"{sub}#{character_id}"})
    return {"ok": True}


@app.get("/characters/{character_id}/dialogues")
async def get_character_dialogues(character_id: int, request: Request):
    sub = _require_login(request)
    char_item = _characters_table.get_item(
        Key={"character_id": f"{sub}#{character_id}"}
    ).get("Item")
    if not char_item:
        raise HTTPException(status_code=404, detail="인물을 찾을 수 없습니다.")

    work_id = int(char_item["work_id"])
    char_name = char_item["name"]

    eps_res = _episodes_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    episodes = eps_res.get("Items", [])

    dialogues = []
    for ep in episodes:
        ep_local_id = int(ep["local_id"])
        ep_title = ep.get("title", "")

        plots_res = _plots_table.scan(
            FilterExpression="user_sub = :s AND episode_id = :e",
            ExpressionAttributeValues={":s": sub, ":e": ep_local_id},
        )
        for plot in plots_res.get("Items", []):
            plot_local_id = int(plot["local_id"])
            plot_title = plot.get("title", "")
            s3_key = f"plots/{sub}/{plot_local_id}.json"
            try:
                obj = _s3.get_object(Bucket=_S3_BUCKET, Key=s3_key)
                content = json.loads(obj["Body"].read())
                found = _extract_dialogues(content.get("content", []), char_name)
                for text in found:
                    dialogues.append({
                        "episode_title": ep_title,
                        "plot_title": plot_title,
                        "plot_id": plot_local_id,
                        "dialogue_text": text,
                    })
            except Exception:
                logger.warning("Dialogue extraction failed for plot %s:\n%s", plot_local_id, traceback.format_exc())

    return dialogues


@app.post("/characters/{character_id}/summarize")
async def summarize_character(character_id: int, request: Request):
    sub = _require_login(request)
    char_item = _characters_table.get_item(
        Key={"character_id": f"{sub}#{character_id}"}
    ).get("Item")
    if not char_item:
        raise HTTPException(status_code=404, detail="인물을 찾을 수 없습니다.")

    work_id = int(char_item["work_id"])
    char_name = char_item["name"]
    char_properties = char_item.get("properties", "{}")
    char_memo = char_item.get("memo", "")

    # Collect all dialogues
    eps_res = _episodes_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    all_dialogues = []
    for ep in eps_res.get("Items", []):
        ep_local_id = int(ep["local_id"])
        plots_res = _plots_table.scan(
            FilterExpression="user_sub = :s AND episode_id = :e",
            ExpressionAttributeValues={":s": sub, ":e": ep_local_id},
        )
        for plot in plots_res.get("Items", []):
            s3_key = f"plots/{sub}/{int(plot['local_id'])}.json"
            try:
                obj = _s3.get_object(Bucket=_S3_BUCKET, Key=s3_key)
                content = json.loads(obj["Body"].read())
                all_dialogues.extend(_extract_dialogues(content.get("content", []), char_name))
            except Exception:
                pass

    # Collect relations for this character
    rels_res = _relations_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    # Build character name map
    chars_res = _characters_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    char_name_map = {int(c["local_id"]): c.get("name", "") for c in chars_res.get("Items", [])}

    char_rels = [
        r for r in rels_res.get("Items", [])
        if int(r.get("from_character_id", -1)) == character_id
        or int(r.get("to_character_id", -1)) == character_id
    ]

    # Build context string
    context_parts = [f"인물 이름: {char_name}"]
    try:
        props = json.loads(char_properties)
        if props:
            props_str = ", ".join(f"{k}: {v}" for k, v in props.items())
            context_parts.append(f"특성: {props_str}")
    except Exception:
        pass

    if char_memo:
        context_parts.append(f"메모: {char_memo}")

    if char_rels:
        rel_lines = []
        for r in char_rels:
            from_id = int(r.get("from_character_id", -1))
            to_id = int(r.get("to_character_id", -1))
            from_name = char_name_map.get(from_id, str(from_id))
            to_name = char_name_map.get(to_id, str(to_id))
            rel_lines.append(f"{from_name} → {r.get('relation_name', '')} → {to_name}")
        context_parts.append("관계:\n" + "\n".join(rel_lines))

    if all_dialogues:
        dialogue_lines = "\n".join(f"- {d}" for d in all_dialogues)
        context_parts.append(f"대사:\n{dialogue_lines}")

    context = "\n\n".join(context_parts)

    openai_key = os.getenv("OPENAI_API_KEY", "")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY 가 설정되지 않았습니다.")

    from langchain_openai import ChatOpenAI
    from langchain.schema import SystemMessage, HumanMessage

    llm = ChatOpenAI(model="gpt-4o-mini", api_key=openai_key)
    messages = [
        SystemMessage(content="주어진 내용을 바탕으로 이 인물의 성격, 타 인물과의 관계, 그리고 지금까지의 행보를 간단히 요약하세요."),
        HumanMessage(content=context),
    ]
    response = await llm.ainvoke(messages)
    return {"summary": response.content}


# ── Character Relations ────────────────────────────────────────────────────

@app.get("/works/{work_id}/relations")
async def get_relations(work_id: int, request: Request):
    sub = _require_login(request)
    res = _relations_table.scan(
        FilterExpression="user_sub = :s AND work_id = :w",
        ExpressionAttributeValues={":s": sub, ":w": work_id},
    )
    return res.get("Items", [])


@app.post("/works/{work_id}/relations")
async def create_relation(work_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    rel_id = body["relation_id"]
    _relations_table.put_item(Item={
        "relation_id":       f"{sub}#{rel_id}",
        "user_sub":          sub,
        "local_id":          rel_id,
        "work_id":           work_id,
        "from_character_id": body.get("from_character_id"),
        "to_character_id":   body.get("to_character_id"),
        "relation_name":     body.get("relation_name", ""),
    })
    return {"ok": True}


@app.delete("/relations/{relation_id}")
async def delete_relation(relation_id: int, request: Request):
    sub = _require_login(request)
    _relations_table.delete_item(Key={"relation_id": f"{sub}#{relation_id}"})
    return {"ok": True}


# ── Graph Layout ───────────────────────────────────────────────────────────

@app.get("/graph-layout/{work_id}")
async def get_graph_layout(work_id: int, request: Request):
    sub = _require_login(request)
    item = _graph_table.get_item(Key={"layout_id": f"{sub}#{work_id}"}).get("Item")
    return item.get("positions", {}) if item else {}


@app.put("/graph-layout/{work_id}")
async def save_graph_layout(work_id: int, request: Request):
    sub = _require_login(request)
    positions = await request.json()
    _graph_table.put_item(Item={
        "layout_id":  f"{sub}#{work_id}",
        "positions":  positions,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@app.get("/logout")
async def logout(request: Request) -> RedirectResponse:
    # JWT는 stateless — 토큰 삭제는 프론트엔드에서 처리
    cognito_domain = os.getenv("COGNITO_DOMAIN")
    client_id = os.getenv("COGNITO_CLIENT_ID")
    logout_uri = os.getenv("LOGOUT_URI", os.getenv("FRONTEND_URL", "/"))

    if cognito_domain and client_id:
        # Redirect to Cognito hosted logout so the Cognito session is also cleared.
        cognito_logout = (
            f"{cognito_domain}/logout"
            f"?client_id={client_id}"
            f"&logout_uri={quote(logout_uri, safe='')}"
        )
        return RedirectResponse(url=cognito_logout)

    return RedirectResponse(url="/")


# ---------------------------------------------------------------------------
# Dev entry-point & AWS Lambda Handler
# ---------------------------------------------------------------------------

from mangum import Mangum
handler = Mangum(app)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
