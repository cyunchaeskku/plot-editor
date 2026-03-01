# Plan: AWS Backend Sync — Replace IndexedDB with API + Global Save Button

## Context
The app currently uses IndexedDB (via `idb`) as its sole persistence layer.
All data lives locally on the user's machine. The AWS backend (Lambda + DynamoDB + S3)
already has full CRUD endpoints but is only used for graph layout and plot content
(fire-and-forget). The goal is to make the backend the source of truth:
fetch data from the API on load, and persist changes only when the user
clicks a Save button — minimising AWS transactions and cost.

---

## Architecture After Migration

```
User action → Zustand store (in-memory, immediate)
                    ↓  (Save button clicked / Cmd+S)
              saveAll() → AWS backend (DynamoDB + S3)
```

Load path: `App mount / selectWork` → fetch from API → populate Zustand store
Save path: `Save button` → `saveAll(workId)` → batch API calls → clear pending queue

---

## New State in `src/store/index.ts`

```typescript
// Auth (moved from Sidebar local state)
isLoggedIn: boolean
userEmail: string | null

// Save lifecycle
isDirty: boolean       // true when any unsaved mutation exists
isSaving: boolean      // true while saveAll() is in flight

// Pending mutation queues (IDs only — objects looked up from current state at save time)
pendingCreates: { works: number[], episodes: number[], plots: number[],
                  characters: number[], relations: number[] }
pendingUpdates: { works: Set<number>, episodes: Set<number>,
                  plots: Set<number>, characters: Set<number> }
pendingDeletes: { works: number[], episodes: number[], plots: number[],
                  characters: number[], relations: number[] }
dirtyPlotContents: Set<number>   // plot IDs whose TipTap content changed (→ S3)
```

Every mutating store action: updates in-memory state + enqueues into pending + sets `isDirty = true`.
Nothing writes to the API except `saveAll`.

---

## ID Generation

IndexedDB autoincrement is gone. Use `Date.now()` as client-side integer ID:
```typescript
const newId = () => Date.now();   // top of store/index.ts
```
This integer becomes both the in-memory `id` and the `*_id` field in POST bodies.
DynamoDB PK stays `{sub}#{id}` — no backend changes needed for this.

---

## Files to Create / Modify

### NEW: `src/api/index.ts`
Single fetch wrapper + all endpoint functions:
```typescript
const BASE = import.meta.env.VITE_API_BASE_URL;
async function api(method, path, body?) { /* fetch + throw on non-2xx */ }

// Auth
fetchMe()

// Works
fetchWorks()                              → GET  /works
apiCreateWork(id, title, type)            → POST /works
apiUpdateWork(id, title, type, planningDoc) → PUT  /works/{id}
apiDeleteWork(id)                         → DELETE /works/{id}

// Episodes
fetchEpisodes(workId)                     → GET  /works/{workId}/episodes
apiCreateEpisode(workId, id, title, orderIndex) → POST /works/{workId}/episodes
apiUpdateEpisode(id, title, orderIndex)   → PUT  /episodes/{id}
apiDeleteEpisode(id)                      → DELETE /episodes/{id}

// Plots
fetchPlots(episodeId)                     → GET  /episodes/{episodeId}/plots
apiCreatePlot(episodeId, id, title, orderIndex) → POST /episodes/{episodeId}/plots
apiUpdatePlotMeta(id, title, orderIndex)  → PUT  /plots/{id}
apiSavePlotContent(id, content)           → PUT  /plots/{id}/content
apiDeletePlot(id)                         → DELETE /plots/{id}

// Characters
fetchCharacters(workId)                   → GET  /works/{workId}/characters
apiCreateCharacter(workId, id, name, color, properties, memo) → POST /works/{workId}/characters
apiUpdateCharacter(id, name, color, properties, memo)         → PUT  /characters/{id}
apiDeleteCharacter(id)                    → DELETE /characters/{id}

// Relations
fetchRelations(workId)                    → GET  /works/{workId}/relations
apiCreateRelation(workId, id, fromId, toId, name) → POST /works/{workId}/relations
apiDeleteRelation(id)                     → DELETE /relations/{id}
```
Each `fetch*` function normalises the DynamoDB response back to the TypeScript interface
(maps `local_id → id`, fills defaults for optional fields).

---

### MODIFY: `src/db/index.ts`
- **Keep**: All TypeScript interfaces (`Work`, `Episode`, `Plot`, `Character`, `CharacterRelation`, `WorkType`)
- **Remove**: `import { openDB }`, `getDb()`, all async CRUD functions
- Run `npm uninstall idb` after

---

### MODIFY: `src/store/index.ts` — full rewrite of action bodies

**Load actions** → call `api.fetch*` instead of `db.*`

**`selectWork(id)`**:
- If `isDirty`: `window.confirm(...)` — if user cancels, abort; if ok, call `discardPending()`
- Fetch episodes + characters + relations in parallel via API
- Set `planningDoc` from the work's `planning_doc` field

**`createWork/Episode/Plot/Character/createRelation`**:
- Generate `id = newId()`
- Push object to in-memory state
- Push `id` to `pendingCreates.*`
- Set `isDirty = true`

**`updateWork/Episode/Plot/Character`**:
- Update in-memory state
- Add `id` to `pendingUpdates.*`
- Set `isDirty = true`

**`setPlotContent(plotId, content)`** (new lightweight action):
- Update `plots[episodeId][i].content` in-memory only
- Add `plotId` to `dirtyPlotContents`
- Set `isDirty = true`
- Does NOT add to `pendingUpdates.plots` (content goes to S3 separately)

**`reorderPlots(episodeId, reordered)`**:
- Update `plots[episodeId]` in-memory
- Add all plot IDs to `pendingUpdates.plots`
- Set `isDirty = true`
- No DB call

**`reorderEpisodes(workId, reordered)`** (new action):
- Update `episodes[workId]` in-memory
- Add all episode IDs to `pendingUpdates.episodes`
- Set `isDirty = true`

**`deleteWork/Episode/Plot/Character`**:
- Walk the in-memory tree to collect all child IDs
- Remove from in-memory state
- Push to `pendingDeletes.*` (all levels of the hierarchy)
- Reconcile: remove from `pendingCreates` any IDs being deleted (net-zero = skip both)
- Set `isDirty = true`

**`deleteRelation(id)`**:
- Remove from in-memory `relations`
- Push to `pendingDeletes.relations`
- Reconcile with `pendingCreates.relations`
- Set `isDirty = true`

**`savePlanningDoc(workId, content)`**:
- Update `work.planning_doc` in-memory `works` array
- Add `workId` to `pendingUpdates.works`
- Set `isDirty = true`

**`saveAll(workId)`**:
```
1. Set isSaving = true
2. Reconcile queues: remove IDs in both creates+deletes (net-zero entities)
   Also: skip pendingUpdates for IDs that are in pendingCreates (create sends latest state)
3. Deletes (parallel per type, in order: relations → characters → plots → episodes → works)
4. Creates (sequential, parent-before-child: works → episodes → plots → characters → relations)
   Each create reads the current object from in-memory state by ID
5. Updates (parallel per type: works, episodes, plots, characters)
6. Plot content to S3 (parallel, skip deleted plots)
7. Clear all pending queues, set isDirty = false, isSaving = false
8. On any error: set isSaving = false, leave queues intact (user can retry)
```

**`discardPending()`**:
- Clear all pending queues
- Set `isDirty = false`

**`loadUserInfo()`**:
- Call `api.fetchMe()`
- On 200: set `isLoggedIn = true`, `userEmail = email`
- On 401: set `isLoggedIn = false`, `userEmail = null`

---

### MODIFY: `src/App.tsx`

1. **On mount**: call `store.loadUserInfo()` and `store.loadWorks()`
2. **Save button** in the right-panel header bar (right of tabs, left of ExportButton):
   ```
   [저장됨 ✓]  — isDirty=false, disabled, grey
   [저장  •]   — isDirty=true, isSaving=false, accent red #AD1B02
   [저장 중...] — isSaving=true, disabled, spinner
   ```
   Only rendered when `selectedWorkId` is set and `isLoggedIn` is true.
3. **`beforeunload` guard**:
   ```typescript
   useEffect(() => {
     const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } };
     window.addEventListener('beforeunload', handler);
     return () => window.removeEventListener('beforeunload', handler);
   }, [isDirty]);
   ```
4. **`Cmd+S` / `Ctrl+S`** shortcut: calls `saveAll(selectedWorkId)` when `isDirty && !isSaving`

---

### MODIFY: `src/components/Editor/index.tsx`
- Remove the 500ms debounce that calls `updatePlot()` and the fire-and-forget `PUT /plots/{id}/content`
- On `onUpdate`: call `store.setPlotContent(plotId, JSON.stringify(editor.getJSON()))`
- Keep `isLoadingRef` guard to prevent marking dirty during programmatic loads

### MODIFY: `src/components/NovelEditor/index.tsx`
- Same debounce removal as Editor; replace with `setPlotContent`

### MODIFY: `src/components/NovelEditor/ChapterList.tsx`
- Remove `import { updateEpisodeOrder } from '../../db'`
- In `handleDragEnd`: call `store.reorderEpisodes(workId, reordered)` instead

### MODIFY: `src/components/CharacterDetail/index.tsx`
- The existing Save button calls `store.updateCharacter(...)` — keep as-is
- `updateCharacter` now just marks in-memory + dirty; the global Save button persists
- Add a small `(이미지 동기화 준비 중)` WIP badge next to the image upload area

### MODIFY: `src/components/Sidebar/index.tsx`
- Remove local `userEmail` state + the `useEffect` that calls `/me`
- Read `userEmail` and `isLoggedIn` from `useStore()`
- Remove `loadWorks()` call on mount (App.tsx handles it now)

---

### MODIFY: `backend/main.py`

**`PUT /works/{work_id}`** — add `planning_doc`:
```python
class UpdateWorkBody(BaseModel):
    title: str
    type: str
    planning_doc: Optional[str] = None

# In the handler, add to UpdateExpression:
# SET planning_doc = :pd
# ExpressionAttributeValues: {":pd": planning_doc or ""}
```

**`POST /works/{work_id}`** — add `planning_doc` to create body and DynamoDB put item.

No backend changes for `image` — deferred (base64 data is too large for DynamoDB; requires S3 upload flow).

---

## Edge Cases

| Case | Handling |
|------|----------|
| Create then delete before save | Reconcile: remove from both queues → 0 API calls |
| Create then update before save | Skip `pendingUpdates` for that ID; create sends latest in-memory state |
| Delete character → orphan relations | `deleteCharacter` walks `relations` array, pushes all related relation IDs to `pendingDeletes.relations` |
| Delete work cascade | `deleteWork` collects all child episode/plot/character/relation IDs and pushes to all `pendingDeletes.*` arrays |
| `selectWork` while dirty | `window.confirm` — if OK, `discardPending()` then proceed; if cancel, abort |
| Not logged in | Save button hidden; `saveAll` guard returns early with a message |
| `saveAll` fails mid-way | `isSaving = false`, queues preserved, error toast shown |

---

## Critical Files

| File | Change type |
|------|-------------|
| `src/api/index.ts` | **NEW** — all API fetch functions |
| `src/db/index.ts` | Types only — remove all idb code |
| `src/store/index.ts` | Full rewrite of action bodies + new state |
| `src/App.tsx` | Save button, Cmd+S, beforeunload, auth on mount |
| `src/components/Editor/index.tsx` | Remove debounce auto-save |
| `src/components/NovelEditor/index.tsx` | Same |
| `src/components/NovelEditor/ChapterList.tsx` | Remove direct db import |
| `src/components/CharacterDetail/index.tsx` | WIP badge on image |
| `src/components/Sidebar/index.tsx` | Read auth from store |
| `backend/main.py` | Add `planning_doc` to work endpoints |

---

## Implementation Order

1. Strip `src/db/index.ts` to types → build breaks → use as map of all call sites
2. Create `src/api/index.ts`
3. Rewrite `src/store/index.ts`
4. Fix `ChapterList.tsx` (remove direct db import)
5. Fix Editor components (remove debounce saves)
6. Update `App.tsx` (Save button + guards)
7. Update `Sidebar/index.tsx` (auth from store)
8. Update `CharacterDetail/index.tsx` (WIP image badge)
9. Update `backend/main.py` (planning_doc fields)
10. `npm uninstall idb`

---

## Verification

1. `npm run build` — must pass with zero errors
2. Open app → not logged in → Save button hidden
3. Log in → works list loads from DynamoDB (not IndexedDB)
4. Create a work → appears in sidebar → Save button shows "저장 •"
5. Click Save → button shows "저장 중..." then "저장됨 ✓"
6. Refresh → work still appears (persisted to DynamoDB)
7. Edit plot content → Save → check S3 bucket `plot-editor-contents` for the JSON file
8. Edit planning doc → Save → `GET /works` response includes `planning_doc`
9. Create work + delete before saving → click Save → 0 API calls for that work (reconciled)
10. Try to close tab with unsaved changes → browser shows leave-page warning
