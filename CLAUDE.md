# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

All persistent state flows through two layers:

1. **`src/db/index.ts`** — Raw SQLite queries via `@tauri-apps/plugin-sql`. Singleton `getDb()` initialises the DB on first call and runs `CREATE TABLE IF NOT EXISTS` migrations inline. All types (`Work`, `Episode`, `Plot`, `Character`, `CharacterRelation`) are defined here.

2. **`src/store/index.ts`** — Single Zustand store. All components read from and write to this store exclusively; they never call `src/db` directly. The store's data is keyed by parent ID (e.g. `episodes: Record<number, Episode[]>`, `plots: Record<number, Plot[]>`). Selecting a work triggers cascaded loads: episodes → characters → relations.

### SQLite DB

File: `ploteditor.db` (Tauri app data dir, configured in `tauri.conf.json` `plugins.sql.preloadConnections`).

Hierarchy: `works` → `episodes` → `plots` (all cascade delete). Characters belong to a work; relations are a join between two characters.

`plots.content` stores TipTap JSON as a serialised string (`JSON.stringify(editor.getJSON())`).
`characters.properties` stores free-form key-value pairs as a serialised JSON object.

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

Plot content auto-saves with a 500 ms debounce on every editor update. An `isLoadingRef` guard prevents saving during programmatic content loads.

### Graph View

`src/components/GraphView/index.tsx` uses React Flow with a custom `CharacterNode` (72×72 circle). **The node must include transparent `<Handle>` components on all four sides** (source + target × top/bottom/left/right, `opacity: 0`) — without them, `markerEnd` arrows are hidden inside the node.

Edges use `type: 'smoothstep'` and `MarkerType.ArrowClosed`. Relations are owned by the `from` character; the `to` character's detail panel displays them read-only as incoming relations.

### Tauri Plugins

Registered in `src-tauri/src/lib.rs`:
- `tauri-plugin-sql` (SQLite)
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

**Endpoints** (19 total):

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
| Plots | `PUT /plots/{id}/content` | Save TipTap JSON to S3 |
| Plots | `GET /plots/{id}/content` | Read TipTap JSON from S3 |
| Characters | `GET/POST /works/{id}/characters` | List / create (includes `ai_summary` field) |
| Characters | `PUT/DELETE /characters/{id}` | Update (with `ai_summary`) / delete |
| Characters | `GET /characters/{id}/dialogues` | Fetch all dialogues for character across all plots in work |
| Characters | `POST /characters/{id}/summarize` | Generate AI character summary via OpenAI GPT-4o-mini |
| Relations | `GET/POST /works/{id}/relations` | List / create |
| Relations | `DELETE /relations/{id}` | Delete |
| Graph | `GET/PUT /graph-layout/{workId}` | Node positions `{charId: {x,y}}` |

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
