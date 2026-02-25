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

## Work Log

Daily development notes are kept in `work_log/YYYY-MM-DD.md`. See `work_log/README.md` for the format.
