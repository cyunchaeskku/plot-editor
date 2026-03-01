# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Start

At the beginning of a new conversation, read the most recent file in `work_log/` to catch up on the latest development context before starting any work.

## Commands

```bash
# Frontend only (type-check + bundle)
npm run build

# Start dev server (frontend only, no Tauri)
npm run dev

# Full app in dev mode (requires Rust + rustup installed)
npm run tauri dev

# Build final desktop binary
npm run tauri build
```

> **Rust prerequisite**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
> The frontend (`npm run build`) works without Rust. Tauri commands require it.

## Architecture

Three-panel desktop app for screenwriters.

```
Left Sidebar  │  Middle Panel  │  Right Panel
──────────────┼────────────────┼──────────────────
Works/Episodes│  Plot cards    │  Editor / Character
/Plots tree   │  (drag&drop)   │  Detail / Graph view
Characters    │                │
```

### Data Flow

All state flows through three layers:

1. **`src/db/index.ts`** — TypeScript type definitions only. No database queries (SQLite/IndexedDB removed). Defines all data types: `Work`, `Episode`, `Plot`, `Character`, `CharacterRelation`.

2. **`src/api/index.ts`** — AWS REST API layer. Calls backend endpoints on AWS Lambda. Normalizes responses from DynamoDB/S3 (`local_id` → `id`). Functions: `fetchWorks()`, `apiCreateWork()`, `summarizePlot()`, etc.

3. **`src/store/index.ts`** — Single Zustand store (in-memory). All components read from and write to this store exclusively; they never call `src/api` or `src/db` directly. Maintains pending mutation queues (`pendingCreates`, `pendingUpdates`, `pendingDeletes`, `dirtyPlotContents`). On user-triggered save (`saveAll(workId)`), batches all changes and sends to AWS. Data keyed by parent ID (e.g. `episodes: Record<number, Episode[]>`, `plots: Record<number, Plot[]>`).

### AWS DynamoDB + S3

**DynamoDB tables** (`src/store` mirrors these):
- `works`: work_id (`{sub}#{local_id}`), title, type (`'plot'` or `'novel'`), planning_doc, work_summary, created_at, updated_at
- `episodes`: episode_id, work_id, title, chapter_summary, order_index, created_at, updated_at
- `plots`: plot_id, episode_id, title, plot_summary, content_s3_key, order_index, created_at, updated_at
- `characters`: character_id, work_id, name, color, properties, memo, image, ai_summary, created_at, updated_at
- `character_relations`: relation_id, work_id, from_character_id, to_character_id, relation_name, created_at
- `graph_layouts`: layout_id, work_id, layout_data (JSON positions), updated_at

**S3 storage**:
- `plots/{sub}/{plot_id}.json` — TipTap JSON editor content
- PK format: All DynamoDB PKs use `{Cognito sub}#{local_id}` for user namespacing.

**Properties field**: `characters.properties` stores free-form key-value pairs as JSON object.

### Editor

`src/components/Editor/` uses TipTap v2 with four custom block nodes defined in `nodes.ts`:

| Node name | CSS class | Purpose |
|---|---|---|
| `sceneHeading` | `.scene-heading` | S#n scene marker, uppercase, purple |
| `dialogue` | `.dialogue-node` | Left colored border, character name header |
| `narration` | `.narration-node` | Centered, italic, gray |
| `stageDirection` | `.stage-direction-node` | Indented, italic, muted |

The `Dialogue` node stores `characterName` and `characterColor` as TipTap node attributes. Slash command menu (`SlashMenu.tsx`) is triggered when the character before the cursor is `/`; it is detected in the `onUpdate` callback via `$from.nodeBefore?.text`. Slash menu CSS (`.slash-menu`, `.slash-menu-item`, `.slash-menu-item.active`) is defined in `App.css`.

The `Dialogue` node has `addKeyboardShortcuts` — Enter on a non-empty dialogue block inserts a new dialogue block with the same `characterName`/`characterColor`; Enter on an empty dialogue block converts it to a `paragraph`.

Plot content changes are captured on every editor `onUpdate` event via `store.setPlotContent(activePlotId, content)`, which marks the plot as dirty. An `isLoadingRef` guard prevents redundant updates during programmatic content loads. Data persists to AWS S3 only when user clicks Save button or presses Cmd+S/Ctrl+S.

### Graph View

`src/components/GraphView/index.tsx` uses React Flow with a custom `CharacterNode` (72×72 circle). **The node must include transparent `<Handle>` components on all four sides** (source + target × top/bottom/left/right, `opacity: 0`) — without them, `markerEnd` arrows are hidden inside the node.

Edges use `type: 'smoothstep'` and `MarkerType.ArrowClosed`. Relations are owned by the `from` character; the `to` character's detail panel displays them read-only as incoming relations.

### Tauri Plugins

Registered in `src-tauri/src/lib.rs`:
- `tauri-plugin-sql` (SQLite) — legacy, no longer actively used for CRUD
- `tauri-plugin-dialog` (save-file dialog for export)
- `tauri-plugin-fs` (write exported files)

Permissions are declared in `src-tauri/capabilities/default.json`. **Adding a new plugin requires both a Cargo dependency and a capability entry.**

### Styling

`src/App.css` imports Tailwind directives and defines all custom CSS classes for TipTap nodes and the slash menu. Base theme is **light grey**: `#f4f5f7` background, `#1f2937` text. (Dark navy theme `#16213e` was replaced in session 2.)

`noUnusedLocals` and `noUnusedParameters` are disabled in `tsconfig.json` to avoid React import false positives.

### Backend

`backend/main.py` — FastAPI server (Python). Run with `python main.py` (port 8000).

Requires `backend/.env` (gitignored) with Cognito + AWS credentials. See README.md for env var list.

**Authentication**: Cognito OIDC via `authlib`. JWT Bearer token issued at OAuth callback (`/authorize`), valid for 30 days (HS256, signed with `SECRET_KEY`). `_require_login(request)` helper reads `Authorization: Bearer {token}` header and decodes JWT, or raises HTTP 401.

**Endpoints** (20 total):

| Group | Method + Path | Notes |
|---|---|---|
| Auth | `GET /login` | Redirect to Cognito Hosted UI |
| Auth | `GET /authorize` | OAuth callback; issues JWT (30-day expiry), redirects to `{FRONTEND_URL}#token={jwt}` |
| Auth | `GET /me` | Decode JWT, return `{sub, email}` |
| Auth | `GET /logout` | Redirect to Cognito logout (JWT stateless, frontend clears token) |
| Works | `GET/POST /works` | List / create |
| Works | `PUT/DELETE /works/{id}` | Update / delete |
| Episodes | `GET/POST /works/{id}/episodes` | List / create |
| Episodes | `PUT/DELETE /episodes/{id}` | Update / delete |
| Plots | `GET/POST /episodes/{id}/plots` | List / create |
| Plots | `PUT/DELETE /plots/{id}` | Update meta / delete (also deletes S3 object) |
| Plots | `POST /plots/{id}/summarize` | Generate AI plot summary via OpenAI GPT-4o-mini |
| Plots | `PUT /plots/{id}/content` | Save TipTap JSON to S3 |
| Plots | `GET /plots/{id}/content` | Read TipTap JSON from S3 |
| Characters | `GET/POST /works/{id}/characters` | List / create (includes `ai_summary` field) |
| Characters | `PUT/DELETE /characters/{id}` | Update (with `ai_summary`) / delete |
| Characters | `GET /characters/{id}/dialogues` | Fetch all dialogues for character across all plots in work |
| Characters | `POST /characters/{id}/summarize` | Generate AI character summary via OpenAI GPT-4o-mini |
| Relations | `GET/POST /works/{id}/relations` | List / create |
| Relations | `DELETE /relations/{id}` | Delete |
| Graph | `GET/PUT /graph-layout/{workId}` | Node positions `{charId: {x,y}}` |

### AI System Prompts (`backend/main.py`)

세 개의 AI 요약 엔드포인트에서 각각 두 가지 모드(최초 생성 / 기존 요약 갱신)로 분기됩니다.

| 엔드포인트 | 조건 | 줄 번호 | 역할 |
|---|---|---|---|
| `POST /plots/{id}/summarize` | 항상 동일 | L541 | 플롯 본문을 읽고 주요 사건을 3~4줄로 요약 (plot 모드) |
| `POST /episodes/{id}/summarize` | 항상 동일 | L433 | 소설 챕터 본문을 읽고 주요 사건을 4~5줄로 요약 (novel 모드) |
| `POST /works/{id}/summarize` | plot 타입 | L287 | 플롯 요약들을 바탕으로 작품 전체 줄거리 생성 |
| `POST /works/{id}/summarize` | novel 타입 | L287 | 챕터 요약들을 바탕으로 작품 전체 줄거리 생성/갱신 |
| `POST /characters/{id}/summarize` | 기존 요약 없음 | L723 | 인물 특성·관계·대사를 바탕으로 성격·관계·행보를 처음 요약 |
| `POST /characters/{id}/summarize` | 기존 요약 있음 | L723 | 기존 인물 요약을 유지하면서 새 대사·정보로 갱신 |

**모델**: 모든 엔드포인트에서 `gpt-4o-mini` 사용 (ChatOpenAI).
**입력 구성**: 인물 요약은 `인물 이름 + 특성 + 메모 + 관계 + 대사(plot) 또는 챕터 본문(novel)` 순으로 조합.
**기존 요약 갱신**: `existing_summary`는 request body에서 받아 `[기존 요약] ... [최신 정보]` 형식으로 HumanMessage에 주입.

### Cloud Sync

Data persistence follows a **single-write on-demand** pattern:
- All data stored in memory (Zustand store); no local SQLite or IndexedDB.
- On user-triggered save (`saveAll(workId)`), all pending mutations are batched and sent to AWS.
- Data only persists in DynamoDB/S3 after explicit save; page refresh resets to last cloud state.

**DynamoDB PK design**: All table PKs use `{Cognito sub}#{local_id}` — e.g. `character_id: "abc123#42"`. This namespaces data per user without separate tables.

**S3 content storage**: TipTap JSON is stored at key `plots/{sub}/{plot_id}.json` in bucket `plot-editor-contents`. DynamoDB `plots` item stores metadata and updated_at timestamp.

**Frontend integration**:
- `src/App.tsx`: On mount, extracts `#token=...` from URL hash, saves to `localStorage` (key: `plot_editor_token`), clears hash.
- `src/api/index.ts`: All `apiFetch` calls include `Authorization: Bearer {token}` header (JWT from localStorage).
- `src/components/Sidebar/index.tsx`: On logout, calls `clearToken()` before redirecting.
- `src/components/GraphView/index.tsx`: Graph layout fetch calls also use Bearer token header.

All API calls include JWT in Authorization header instead of cookies.

**Lambda deployment note**: Python packages required by Lambda (`langchain`, `langchain-openai`, `openai`, `PyJWT`) must be manually installed in `backend/lambda_package/` directory (not just `requirements.txt`). Run `pip install -t lambda_package -r requirements.txt` before deploying via `serverless deploy`.

## Work Log

Daily development notes are kept in `work_log/YYYY-MM-DD.md`. See `work_log/README.md` for the format.
