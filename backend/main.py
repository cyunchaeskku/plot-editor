import os
import sys

# Lambda 환경에서 Linux 호환 패키지를 사용 (pip --platform으로 빌드된 manylinux 바이너리)
_lambda_pkg = os.path.join(os.path.dirname(__file__), "lambda_package")
if os.path.isdir(_lambda_pkg) and _lambda_pkg not in sys.path:
    sys.path.insert(0, _lambda_pkg)

from datetime import datetime, timezone
from urllib.parse import quote

import boto3
from authlib.integrations.starlette_client import OAuth
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

load_dotenv()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_env(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise ValueError(f"환경변수 {key} 가 .env 에 설정되지 않았습니다.")
    return val


def _require_login(request: Request) -> str:
    """로그인된 사용자의 sub 반환, 미로그인 시 401"""
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return user["sub"]


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Plot Editor Auth")

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

_dynamodb = boto3.resource(
    "dynamodb",
    region_name=_region,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
_users_table      = _dynamodb.Table("users")
_works_table      = _dynamodb.Table("works")
_episodes_table   = _dynamodb.Table("episodes")
_plots_table      = _dynamodb.Table("plots")
_characters_table = _dynamodb.Table("characters")
_relations_table  = _dynamodb.Table("character_relations")
_graph_table      = _dynamodb.Table("graph_layouts")

_s3 = boto3.client(
    "s3",
    region_name=_region,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
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
    request.session["user"] = dict(userinfo)

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

    frontend_url = os.getenv("FRONTEND_URL", "/")
    return RedirectResponse(url=frontend_url)


@app.get("/me")
async def me(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="로그인되지 않았습니다.")
    return {"sub": user.get("sub"), "email": user.get("email", "")}


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
        "work_id":    f"{sub}#{work_id}",
        "user_sub":   sub,
        "local_id":   work_id,
        "title":      body.get("title", ""),
        "type":       body.get("type", "plot"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@app.put("/works/{work_id}")
async def update_work(work_id: int, request: Request):
    sub = _require_login(request)
    body = await request.json()
    _works_table.update_item(
        Key={"work_id": f"{sub}#{work_id}"},
        UpdateExpression="SET title = :t, #tp = :tp",
        ExpressionAttributeNames={"#tp": "type"},
        ExpressionAttributeValues={":t": body.get("title", ""), ":tp": body.get("type", "plot")},
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
        pass
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
    except _s3.exceptions.NoSuchKey:
        return Response(content=b"{}", media_type="application/json")


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
        UpdateExpression="SET #n = :n, color = :c, properties = :p, memo = :m",
        ExpressionAttributeNames={"#n": "name"},
        ExpressionAttributeValues={
            ":n": body.get("name", ""), ":c": body.get("color", ""),
            ":p": body.get("properties", "{}"), ":m": body.get("memo", ""),
        },
    )
    return {"ok": True}


@app.delete("/characters/{character_id}")
async def delete_character(character_id: int, request: Request):
    sub = _require_login(request)
    _characters_table.delete_item(Key={"character_id": f"{sub}#{character_id}"})
    return {"ok": True}


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
    request.session.pop("user", None)

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
