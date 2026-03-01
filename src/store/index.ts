import { create } from 'zustand';
import type { Work, Episode, Plot, Character, CharacterRelation, WorkType } from '../db';
import * as api from '../api';

const newId = () => Date.now();

// ── Pending queue types ───────────────────────────────────────────────────────

interface PendingCreates {
  works: number[];
  episodes: number[];
  plots: number[];
  characters: number[];
  relations: number[];
}

interface PendingUpdates {
  works: Set<number>;
  episodes: Set<number>;
  plots: Set<number>;
  characters: Set<number>;
}

interface PendingDeletes {
  works: number[];
  episodes: number[];
  plots: number[];
  characters: number[];
  relations: number[];
}

function emptyCreates(): PendingCreates {
  return { works: [], episodes: [], plots: [], characters: [], relations: [] };
}
function emptyUpdates(): PendingUpdates {
  return {
    works: new Set(),
    episodes: new Set(),
    plots: new Set(),
    characters: new Set(),
  };
}
function emptyDeletes(): PendingDeletes {
  return { works: [], episodes: [], plots: [], characters: [], relations: [] };
}

// ── State interface ───────────────────────────────────────────────────────────

interface AppState {
  // Auth
  isLoggedIn: boolean;
  userEmail: string | null;

  // Save lifecycle
  isDirty: boolean;
  isSaving: boolean;

  // Pending mutation queues
  pendingCreates: PendingCreates;
  pendingUpdates: PendingUpdates;
  pendingDeletes: PendingDeletes;
  dirtyPlotContents: Set<number>;

  // Data
  works: Work[];
  episodes: Record<number, Episode[]>;
  plots: Record<number, Plot[]>;
  characters: Record<number, Character[]>;
  relations: CharacterRelation[];

  // Selection
  selectedWorkId: number | null;
  selectedEpisodeId: number | null;
  selectedPlotIds: number[];
  selectedCharacterId: number | null;

  // UI state
  expandedWorkIds: Set<number>;
  expandedEpisodeIds: Set<number>;
  rightPanelMode: 'editor' | 'character' | 'graph' | 'planning';

  // Planning doc
  planningDoc: string;

  // Actions
  loadUserInfo: () => Promise<void>;
  loadWorks: () => Promise<void>;
  loadEpisodes: (workId: number) => Promise<void>;
  loadPlots: (episodeId: number) => Promise<void>;
  loadCharacters: (workId: number) => Promise<void>;
  loadRelations: (workId: number) => Promise<void>;

  createWork: (title: string, type?: WorkType) => Promise<void>;
  updateWork: (id: number, title: string) => void;
  updateWorkType: (id: number, type: WorkType) => void;
  deleteWork: (id: number) => void;

  createEpisode: (workId: number, title: string) => Promise<void>;
  updateEpisode: (id: number, title: string) => void;
  deleteEpisode: (id: number) => void;
  reorderEpisodes: (workId: number, reordered: Episode[]) => void;

  createPlot: (episodeId: number, title: string) => Promise<void>;
  updatePlot: (id: number, title: string, content: string) => void;
  setPlotContent: (plotId: number, content: string) => void;
  reorderPlots: (episodeId: number, plots: Plot[]) => void;
  deletePlot: (id: number) => void;

  savePlanningDoc: (workId: number, content: string) => void;

  createCharacter: (workId: number, name: string, color: string) => void;
  updateCharacter: (
    id: number,
    name: string,
    color: string,
    properties: string,
    memo?: string,
    image?: string,
    aiSummary?: string,
  ) => void;
  deleteCharacter: (id: number) => void;
  createRelation: (fromId: number, toId: number, name: string) => void;
  deleteRelation: (id: number) => void;

  saveAll: (workId: number) => Promise<void>;
  discardPending: () => void;

  selectWork: (id: number) => void;
  selectEpisode: (id: number) => void;
  selectPlot: (id: number, multi?: boolean) => void;
  selectCharacter: (id: number | null) => void;
  toggleWorkExpand: (id: number) => void;
  toggleEpisodeExpand: (id: number) => void;
  setRightPanelMode: (mode: 'editor' | 'character' | 'graph' | 'planning') => void;
}

// ── Helper: find a plot across all episode buckets ────────────────────────────

function findPlot(
  plotsMap: Record<number, Plot[]>,
  plotId: number,
): Plot | undefined {
  for (const epPlots of Object.values(plotsMap)) {
    const p = epPlots.find((p) => p.id === plotId);
    if (p) return p;
  }
  return undefined;
}

function findEpisode(
  episodesMap: Record<number, Episode[]>,
  epId: number,
): Episode | undefined {
  for (const eps of Object.values(episodesMap)) {
    const e = eps.find((e) => e.id === epId);
    if (e) return e;
  }
  return undefined;
}

function findCharacter(
  charsMap: Record<number, Character[]>,
  charId: number,
): Character | undefined {
  for (const chars of Object.values(charsMap)) {
    const c = chars.find((c) => c.id === charId);
    if (c) return c;
  }
  return undefined;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  isLoggedIn: false,
  userEmail: null,

  isDirty: false,
  isSaving: false,

  pendingCreates: emptyCreates(),
  pendingUpdates: emptyUpdates(),
  pendingDeletes: emptyDeletes(),
  dirtyPlotContents: new Set(),

  works: [],
  episodes: {},
  plots: {},
  characters: {},
  relations: [],

  selectedWorkId: null,
  selectedEpisodeId: null,
  selectedPlotIds: [],
  selectedCharacterId: null,

  expandedWorkIds: new Set(),
  expandedEpisodeIds: new Set(),
  rightPanelMode: 'editor',
  planningDoc: '',

  // ── Auth ──────────────────────────────────────────────────────────────────

  loadUserInfo: async () => {
    try {
      const data = await api.fetchMe();
      set({ isLoggedIn: true, userEmail: data.email });
    } catch {
      set({ isLoggedIn: false, userEmail: null });
    }
  },

  // ── Load actions ──────────────────────────────────────────────────────────

  loadWorks: async () => {
    try {
      const works = await api.fetchWorks();
      set({ works });
    } catch {
      set({ works: [] });
    }
  },

  loadEpisodes: async (workId) => {
    try {
      const episodes = await api.fetchEpisodes(workId);
      set((s) => ({ episodes: { ...s.episodes, [workId]: episodes } }));
    } catch {
      set((s) => ({ episodes: { ...s.episodes, [workId]: [] } }));
    }
  },

  loadPlots: async (episodeId) => {
    try {
      const plotMetas = await api.fetchPlots(episodeId);
      // Fetch S3 content for each plot in parallel
      const plots = await Promise.all(
        plotMetas.map(async (plot) => ({
          ...plot,
          content: await api.fetchPlotContent(plot.id),
        })),
      );
      set((s) => ({ plots: { ...s.plots, [episodeId]: plots } }));
    } catch {
      set((s) => ({ plots: { ...s.plots, [episodeId]: [] } }));
    }
  },

  loadCharacters: async (workId) => {
    try {
      const chars = await api.fetchCharacters(workId);
      set((s) => ({ characters: { ...s.characters, [workId]: chars } }));
    } catch {
      set((s) => ({ characters: { ...s.characters, [workId]: [] } }));
    }
  },

  loadRelations: async (workId) => {
    try {
      const items = await api.fetchRelations(workId);
      const { characters } = get();
      const charMap = new Map((characters[workId] || []).map((c) => [c.id, c]));
      const enriched = items.map((rel) => ({
        ...rel,
        from_name: charMap.get(rel.from_character_id)?.name,
        from_color: charMap.get(rel.from_character_id)?.color,
        to_name: charMap.get(rel.to_character_id)?.name,
        to_color: charMap.get(rel.to_character_id)?.color,
      }));
      set({ relations: enriched });
    } catch {
      set({ relations: [] });
    }
  },

  // ── Works ─────────────────────────────────────────────────────────────────

  createWork: async (title, type = 'plot') => {
    const id = newId();
    const work: Work = {
      id,
      title,
      type,
      created_at: new Date().toISOString(),
      planning_doc: '',
    };
    // Add to local state immediately (optimistic), no dirty flag
    set((s) => ({ works: [...s.works, work] }));
    try {
      await api.apiCreateWork(id, title, type, '');
      // Select the new work — isDirty is still false so no warning dialog
      get().selectWork(id);
    } catch (err) {
      // Rollback on failure
      set((s) => ({ works: s.works.filter((w) => w.id !== id) }));
      console.error('createWork failed:', err);
    }
  },

  updateWork: (id, title) => {
    set((s) => ({
      works: s.works.map((w) => (w.id === id ? { ...w, title } : w)),
      pendingUpdates: {
        ...s.pendingUpdates,
        works: new Set([...s.pendingUpdates.works, id]),
      },
      isDirty: true,
    }));
  },

  updateWorkType: (id, type) => {
    set((s) => ({
      works: s.works.map((w) => (w.id === id ? { ...w, type } : w)),
      pendingUpdates: {
        ...s.pendingUpdates,
        works: new Set([...s.pendingUpdates.works, id]),
      },
      isDirty: true,
    }));
  },

  deleteWork: (id) => {
    const { episodes, plots, characters, relations } = get();
    const workEpisodes = episodes[id] || [];
    const episodeIds = workEpisodes.map((ep) => ep.id);
    const plotIds = episodeIds.flatMap((epId) => (plots[epId] || []).map((p) => p.id));
    const workChars = characters[id] || [];
    const charIds = workChars.map((c) => c.id);
    const charIdSet = new Set(charIds);
    const relIds = relations
      .filter((r) => charIdSet.has(r.from_character_id) || charIdSet.has(r.to_character_id))
      .map((r) => r.id);

    set((s) => {
      const pc = s.pendingCreates;
      const pd = s.pendingDeletes;

      const workWasNew = pc.works.includes(id);
      const newEpCreates = pc.episodes.filter((eid) => !episodeIds.includes(eid));
      const newPlotCreates = pc.plots.filter((pid) => !plotIds.includes(pid));
      const newCharCreates = pc.characters.filter((cid) => !charIds.includes(cid));
      const newRelCreates = pc.relations.filter((rid) => !relIds.includes(rid));

      const persistedEpIds = episodeIds.filter((eid) => !pc.episodes.includes(eid));
      const persistedPlotIds = plotIds.filter((pid) => !pc.plots.includes(pid));
      const persistedCharIds = charIds.filter((cid) => !pc.characters.includes(cid));
      const persistedRelIds = relIds.filter((rid) => !pc.relations.includes(rid));

      const pu = s.pendingUpdates;
      const newPU: PendingUpdates = {
        works: new Set([...pu.works].filter((wid) => wid !== id)),
        episodes: new Set([...pu.episodes].filter((eid) => !episodeIds.includes(eid))),
        plots: new Set([...pu.plots].filter((pid) => !plotIds.includes(pid))),
        characters: new Set([...pu.characters].filter((cid) => !charIds.includes(cid))),
      };

      const newEpisodes = { ...s.episodes };
      delete newEpisodes[id];
      const newPlots = { ...s.plots };
      episodeIds.forEach((eid) => delete newPlots[eid]);
      const newCharacters = { ...s.characters };
      delete newCharacters[id];

      return {
        works: s.works.filter((w) => w.id !== id),
        episodes: newEpisodes,
        plots: newPlots,
        characters: newCharacters,
        relations: s.relations.filter(
          (r) => !charIdSet.has(r.from_character_id) && !charIdSet.has(r.to_character_id),
        ),
        selectedWorkId: s.selectedWorkId === id ? null : s.selectedWorkId,
        selectedEpisodeId: episodeIds.includes(s.selectedEpisodeId ?? -1)
          ? null
          : s.selectedEpisodeId,
        selectedPlotIds: s.selectedPlotIds.filter((pid) => !plotIds.includes(pid)),
        pendingCreates: {
          works: pc.works.filter((wid) => wid !== id),
          episodes: newEpCreates,
          plots: newPlotCreates,
          characters: newCharCreates,
          relations: newRelCreates,
        },
        pendingUpdates: newPU,
        pendingDeletes: {
          works: workWasNew ? pd.works : [...pd.works, id],
          episodes: [...pd.episodes, ...persistedEpIds],
          plots: [...pd.plots, ...persistedPlotIds],
          characters: [...pd.characters, ...persistedCharIds],
          relations: [...pd.relations, ...persistedRelIds],
        },
        dirtyPlotContents: new Set(
          [...s.dirtyPlotContents].filter((pid) => !plotIds.includes(pid)),
        ),
        isDirty: true,
      };
    });
  },

  // ── Episodes ──────────────────────────────────────────────────────────────

  createEpisode: async (workId, title) => {
    const id = newId();
    const eps = get().episodes[workId] || [];
    const episode: Episode = {
      id,
      work_id: workId,
      title,
      order_index: eps.length,
    };
    set((s) => ({
      episodes: { ...s.episodes, [workId]: [...(s.episodes[workId] || []), episode] },
      pendingCreates: {
        ...s.pendingCreates,
        episodes: [...s.pendingCreates.episodes, id],
      },
      isDirty: true,
    }));
  },

  updateEpisode: (id, title) => {
    set((s) => {
      const newEpisodes = { ...s.episodes };
      for (const [wId, eps] of Object.entries(s.episodes)) {
        const idx = eps.findIndex((e) => e.id === id);
        if (idx !== -1) {
          newEpisodes[Number(wId)] = eps.map((e, i) => (i === idx ? { ...e, title } : e));
          break;
        }
      }
      return {
        episodes: newEpisodes,
        pendingUpdates: {
          ...s.pendingUpdates,
          episodes: new Set([...s.pendingUpdates.episodes, id]),
        },
        isDirty: true,
      };
    });
  },

  deleteEpisode: (id) => {
    const { plots } = get();
    const epPlots = plots[id] || [];
    const plotIds = epPlots.map((p) => p.id);

    set((s) => {
      const pc = s.pendingCreates;
      const pd = s.pendingDeletes;
      const epWasNew = pc.episodes.includes(id);
      const persistedPlotIds = plotIds.filter((pid) => !pc.plots.includes(pid));

      const newEpisodes = { ...s.episodes };
      for (const wId of Object.keys(newEpisodes)) {
        newEpisodes[Number(wId)] = newEpisodes[Number(wId)].filter((e) => e.id !== id);
      }
      const newPlots = { ...s.plots };
      delete newPlots[id];

      const pu = s.pendingUpdates;

      return {
        episodes: newEpisodes,
        plots: newPlots,
        selectedEpisodeId: s.selectedEpisodeId === id ? null : s.selectedEpisodeId,
        selectedPlotIds: s.selectedPlotIds.filter((pid) => !plotIds.includes(pid)),
        pendingCreates: {
          ...pc,
          episodes: pc.episodes.filter((eid) => eid !== id),
          plots: pc.plots.filter((pid) => !plotIds.includes(pid)),
        },
        pendingUpdates: {
          ...pu,
          episodes: new Set([...pu.episodes].filter((eid) => eid !== id)),
          plots: new Set([...pu.plots].filter((pid) => !plotIds.includes(pid))),
        },
        pendingDeletes: {
          ...pd,
          episodes: epWasNew ? pd.episodes : [...pd.episodes, id],
          plots: [...pd.plots, ...persistedPlotIds],
        },
        dirtyPlotContents: new Set(
          [...s.dirtyPlotContents].filter((pid) => !plotIds.includes(pid)),
        ),
        isDirty: true,
      };
    });
  },

  reorderEpisodes: (workId, reordered) => {
    set((s) => ({
      episodes: { ...s.episodes, [workId]: reordered },
      pendingUpdates: {
        ...s.pendingUpdates,
        episodes: new Set([...s.pendingUpdates.episodes, ...reordered.map((e) => e.id)]),
      },
      isDirty: true,
    }));
  },

  // ── Plots ─────────────────────────────────────────────────────────────────

  createPlot: async (episodeId, title) => {
    const id = newId();
    const ps = get().plots[episodeId] || [];
    const plot: Plot = {
      id,
      episode_id: episodeId,
      title,
      content: '{}',
      order_index: ps.length,
    };
    set((s) => ({
      plots: {
        ...s.plots,
        [episodeId]: [...(s.plots[episodeId] || []), plot],
      },
      pendingCreates: {
        ...s.pendingCreates,
        plots: [...s.pendingCreates.plots, id],
      },
      isDirty: true,
    }));
  },

  updatePlot: (id, title, content) => {
    set((s) => {
      const newPlots = { ...s.plots };
      for (const [epId, epPlots] of Object.entries(s.plots)) {
        const idx = epPlots.findIndex((p) => p.id === id);
        if (idx !== -1) {
          newPlots[Number(epId)] = epPlots.map((p, i) =>
            i === idx ? { ...p, title, content } : p,
          );
          break;
        }
      }
      return {
        plots: newPlots,
        pendingUpdates: {
          ...s.pendingUpdates,
          plots: new Set([...s.pendingUpdates.plots, id]),
        },
        dirtyPlotContents: new Set([...s.dirtyPlotContents, id]),
        isDirty: true,
      };
    });
  },

  setPlotContent: (plotId, content) => {
    set((s) => {
      const newPlots = { ...s.plots };
      for (const [epId, epPlots] of Object.entries(s.plots)) {
        const idx = epPlots.findIndex((p) => p.id === plotId);
        if (idx !== -1) {
          newPlots[Number(epId)] = epPlots.map((p, i) => (i === idx ? { ...p, content } : p));
          break;
        }
      }
      return {
        plots: newPlots,
        dirtyPlotContents: new Set([...s.dirtyPlotContents, plotId]),
        isDirty: true,
      };
    });
  },

  reorderPlots: (episodeId, plots) => {
    set((s) => ({
      plots: { ...s.plots, [episodeId]: plots },
      pendingUpdates: {
        ...s.pendingUpdates,
        plots: new Set([...s.pendingUpdates.plots, ...plots.map((p) => p.id)]),
      },
      isDirty: true,
    }));
  },

  deletePlot: (id) => {
    set((s) => {
      const pc = s.pendingCreates;
      const pd = s.pendingDeletes;
      const plotWasNew = pc.plots.includes(id);

      const newPlots = { ...s.plots };
      for (const epId of Object.keys(newPlots)) {
        newPlots[Number(epId)] = newPlots[Number(epId)].filter((p) => p.id !== id);
      }

      return {
        plots: newPlots,
        selectedPlotIds: s.selectedPlotIds.filter((pid) => pid !== id),
        pendingCreates: { ...pc, plots: pc.plots.filter((pid) => pid !== id) },
        pendingUpdates: {
          ...s.pendingUpdates,
          plots: new Set([...s.pendingUpdates.plots].filter((pid) => pid !== id)),
        },
        pendingDeletes: {
          ...pd,
          plots: plotWasNew ? pd.plots : [...pd.plots, id],
        },
        dirtyPlotContents: new Set([...s.dirtyPlotContents].filter((pid) => pid !== id)),
        isDirty: true,
      };
    });
  },

  savePlanningDoc: (workId, content) => {
    set((s) => ({
      planningDoc: content,
      works: s.works.map((w) => (w.id === workId ? { ...w, planning_doc: content } : w)),
      pendingUpdates: {
        ...s.pendingUpdates,
        works: new Set([...s.pendingUpdates.works, workId]),
      },
      isDirty: true,
    }));
  },

  // ── Characters ────────────────────────────────────────────────────────────

  createCharacter: (workId, name, color) => {
    const id = newId();
    const character: Character = {
      id,
      work_id: workId,
      name,
      color,
      properties: '{}',
      memo: '',
      image: '',
    };
    set((s) => ({
      characters: {
        ...s.characters,
        [workId]: [...(s.characters[workId] || []), character],
      },
      pendingCreates: {
        ...s.pendingCreates,
        characters: [...s.pendingCreates.characters, id],
      },
      isDirty: true,
    }));
  },

  updateCharacter: (id, name, color, properties, memo = '', image = '', aiSummary = '') => {
    const { selectedWorkId, episodes, plots: plotsMap } = get();

    // Find old char for dialogue sync
    const workChars = selectedWorkId ? (get().characters[selectedWorkId] || []) : [];
    const oldChar = workChars.find((c) => c.id === id);
    const oldName = oldChar?.name ?? '';

    // Sync dialogue nodes in-memory across all plots of this work
    const newPlotsMap = { ...plotsMap };
    const dirtiedPlots = new Set<number>();

    if (selectedWorkId && (oldName !== name || oldChar?.color !== color)) {
      const workEpisodes = episodes[selectedWorkId] || [];
      for (const ep of workEpisodes) {
        const epPlots = plotsMap[ep.id] || [];
        let anyChanged = false;
        const updatedEpPlots = epPlots.map((plot) => {
          try {
            const content = JSON.parse(plot.content);
            if (!content.content) return plot;
            let changed = false;
            const syncNodes = (nodes: any[]): any[] =>
              nodes.map((node: any) => {
                if (node.type === 'dialogue' && node.attrs?.characterName === oldName) {
                  changed = true;
                  return {
                    ...node,
                    attrs: { ...node.attrs, characterName: name, characterColor: color },
                  };
                }
                if (node.content) return { ...node, content: syncNodes(node.content) };
                return node;
              });
            const newContent = { ...content, content: syncNodes(content.content) };
            if (changed) {
              dirtiedPlots.add(plot.id);
              anyChanged = true;
              return { ...plot, content: JSON.stringify(newContent) };
            }
          } catch {}
          return plot;
        });
        if (anyChanged) newPlotsMap[ep.id] = updatedEpPlots;
      }
    }

    set((s) => ({
      characters: {
        ...s.characters,
        ...(selectedWorkId
          ? {
              [selectedWorkId]: (s.characters[selectedWorkId] || []).map((c) =>
                c.id === id ? { ...c, name, color, properties, memo, image, ai_summary: aiSummary } : c,
              ),
            }
          : {}),
      },
      plots: { ...s.plots, ...newPlotsMap },
      pendingUpdates: {
        ...s.pendingUpdates,
        characters: new Set([...s.pendingUpdates.characters, id]),
      },
      dirtyPlotContents: new Set([...s.dirtyPlotContents, ...dirtiedPlots]),
      isDirty: true,
    }));
  },

  deleteCharacter: (id) => {
    const { selectedWorkId, relations } = get();
    const relatedRelIds = relations
      .filter((r) => r.from_character_id === id || r.to_character_id === id)
      .map((r) => r.id);

    set((s) => {
      const pc = s.pendingCreates;
      const pd = s.pendingDeletes;
      const charWasNew = pc.characters.includes(id);
      const newRelCreates = pc.relations.filter((rid) => !relatedRelIds.includes(rid));
      const persistedRelIds = relatedRelIds.filter((rid) => !pc.relations.includes(rid));

      return {
        characters: selectedWorkId
          ? {
              ...s.characters,
              [selectedWorkId]: (s.characters[selectedWorkId] || []).filter((c) => c.id !== id),
            }
          : s.characters,
        relations: s.relations.filter(
          (r) => r.from_character_id !== id && r.to_character_id !== id,
        ),
        selectedCharacterId: s.selectedCharacterId === id ? null : s.selectedCharacterId,
        pendingCreates: {
          ...pc,
          characters: pc.characters.filter((cid) => cid !== id),
          relations: newRelCreates,
        },
        pendingUpdates: {
          ...s.pendingUpdates,
          characters: new Set([...s.pendingUpdates.characters].filter((cid) => cid !== id)),
        },
        pendingDeletes: {
          ...pd,
          characters: charWasNew ? pd.characters : [...pd.characters, id],
          relations: [...pd.relations, ...persistedRelIds],
        },
        isDirty: true,
      };
    });
  },

  createRelation: (fromId, toId, name) => {
    const id = newId();
    const { selectedWorkId, characters } = get();
    const charMap = new Map(
      (characters[selectedWorkId ?? -1] || []).map((c) => [c.id, c]),
    );
    const fromChar = charMap.get(fromId);
    const toChar = charMap.get(toId);

    const rel: CharacterRelation = {
      id,
      from_character_id: fromId,
      to_character_id: toId,
      relation_name: name,
      from_name: fromChar?.name,
      from_color: fromChar?.color,
      to_name: toChar?.name,
      to_color: toChar?.color,
    };

    set((s) => ({
      relations: [...s.relations, rel],
      pendingCreates: {
        ...s.pendingCreates,
        relations: [...s.pendingCreates.relations, id],
      },
      isDirty: true,
    }));
  },

  deleteRelation: (id) => {
    set((s) => {
      const pc = s.pendingCreates;
      const pd = s.pendingDeletes;
      const wasNew = pc.relations.includes(id);
      return {
        relations: s.relations.filter((r) => r.id !== id),
        pendingCreates: {
          ...pc,
          relations: pc.relations.filter((rid) => rid !== id),
        },
        pendingDeletes: {
          ...pd,
          relations: wasNew ? pd.relations : [...pd.relations, id],
        },
        isDirty: true,
      };
    });
  },

  // ── Save / Discard ────────────────────────────────────────────────────────

  saveAll: async (workId) => {
    const { isLoggedIn, isSaving } = get();
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (isSaving) return;

    set({ isSaving: true });

    try {
      const {
        pendingCreates: pc,
        pendingUpdates: pu,
        pendingDeletes: pd,
        dirtyPlotContents,
        works,
        episodes,
        plots,
        characters,
        relations,
      } = get();

      // Reconcile sets
      const deletedWorkSet = new Set(pd.works);
      const deletedEpSet = new Set(pd.episodes);
      const deletedPlotSet = new Set(pd.plots);
      const deletedCharSet = new Set(pd.characters);
      const deletedRelSet = new Set(pd.relations);

      const createdWorkSet = new Set(pc.works);
      const createdEpSet = new Set(pc.episodes);
      const createdPlotSet = new Set(pc.plots);
      const createdCharSet = new Set(pc.characters);
      const createdRelSet = new Set(pc.relations);

      // Net creates (skip if also deleted)
      const worksToCreate = pc.works.filter((id) => !deletedWorkSet.has(id));
      const episodesToCreate = pc.episodes.filter((id) => !deletedEpSet.has(id));
      const plotsToCreate = pc.plots.filter((id) => !deletedPlotSet.has(id));
      const charsToCreate = pc.characters.filter((id) => !deletedCharSet.has(id));
      const relsToCreate = pc.relations.filter((id) => !deletedRelSet.has(id));

      // Net deletes (skip if only just created — net-zero)
      const worksToDelete = pd.works.filter((id) => !createdWorkSet.has(id));
      const episodesToDelete = pd.episodes.filter((id) => !createdEpSet.has(id));
      const plotsToDelete = pd.plots.filter((id) => !createdPlotSet.has(id));
      const charsToDelete = pd.characters.filter((id) => !createdCharSet.has(id));
      const relsToDelete = pd.relations.filter((id) => !createdRelSet.has(id));

      // Net updates (skip if deleted or just created — create sends latest state)
      const worksToUpdate = [...pu.works].filter(
        (id) => !deletedWorkSet.has(id) && !createdWorkSet.has(id),
      );
      const episodesToUpdate = [...pu.episodes].filter(
        (id) => !deletedEpSet.has(id) && !createdEpSet.has(id),
      );
      const plotsToUpdate = [...pu.plots].filter(
        (id) => !deletedPlotSet.has(id) && !createdPlotSet.has(id),
      );
      const charsToUpdate = [...pu.characters].filter(
        (id) => !deletedCharSet.has(id) && !createdCharSet.has(id),
      );

      // Step 3: Deletes (order: relations → characters → plots → episodes → works)
      await Promise.all(relsToDelete.map((id) => api.apiDeleteRelation(id)));
      await Promise.all(charsToDelete.map((id) => api.apiDeleteCharacter(id)));
      await Promise.all(plotsToDelete.map((id) => api.apiDeletePlot(id)));
      await Promise.all(episodesToDelete.map((id) => api.apiDeleteEpisode(id)));
      await Promise.all(worksToDelete.map((id) => api.apiDeleteWork(id)));

      // Step 4: Creates (parent before child)
      for (const id of worksToCreate) {
        const w = works.find((x) => x.id === id);
        if (w) await api.apiCreateWork(w.id, w.title, w.type, w.planning_doc || '');
      }
      for (const id of episodesToCreate) {
        const ep = findEpisode(episodes, id);
        if (ep) await api.apiCreateEpisode(ep.work_id, ep.id, ep.title, ep.order_index);
      }
      for (const id of plotsToCreate) {
        const pl = findPlot(plots, id);
        if (pl) await api.apiCreatePlot(pl.episode_id, pl.id, pl.title, pl.order_index);
      }
      for (const id of charsToCreate) {
        const ch = findCharacter(characters, id);
        if (ch)
          await api.apiCreateCharacter(
            ch.work_id, ch.id, ch.name, ch.color, ch.properties, ch.memo,
          );
      }
      for (const id of relsToCreate) {
        const rel = relations.find((r) => r.id === id);
        if (!rel) continue;
        // Derive workId from from_character
        let relWorkId = workId; // fallback
        for (const [wId, chars] of Object.entries(characters)) {
          if (chars.find((c) => c.id === rel.from_character_id)) {
            relWorkId = Number(wId);
            break;
          }
        }
        await api.apiCreateRelation(
          relWorkId, rel.id, rel.from_character_id, rel.to_character_id, rel.relation_name,
        );
      }

      // Step 5: Updates (parallel per type)
      await Promise.all([
        ...worksToUpdate.map((id) => {
          const w = works.find((x) => x.id === id);
          return w ? api.apiUpdateWork(w.id, w.title, w.type, w.planning_doc || '') : Promise.resolve();
        }),
        ...episodesToUpdate.map((id) => {
          const ep = findEpisode(episodes, id);
          return ep ? api.apiUpdateEpisode(ep.id, ep.title, ep.order_index) : Promise.resolve();
        }),
        ...plotsToUpdate.map((id) => {
          const pl = findPlot(plots, id);
          return pl ? api.apiUpdatePlotMeta(pl.id, pl.title, pl.order_index) : Promise.resolve();
        }),
        ...charsToUpdate.map((id) => {
          const ch = findCharacter(characters, id);
          return ch
            ? api.apiUpdateCharacter(ch.id, ch.name, ch.color, ch.properties, ch.memo, ch.ai_summary)
            : Promise.resolve();
        }),
      ]);

      // Step 6: Plot content → S3 (parallel, skip deleted)
      const contentIds = [...dirtyPlotContents].filter((id) => !deletedPlotSet.has(id));
      await Promise.all(
        contentIds.map((id) => {
          const pl = findPlot(plots, id);
          return pl && pl.content && pl.content !== '{}'
            ? api.apiSavePlotContent(pl.id, pl.content)
            : Promise.resolve();
        }),
      );

      // Step 7: Clear queues
      set({
        pendingCreates: emptyCreates(),
        pendingUpdates: emptyUpdates(),
        pendingDeletes: emptyDeletes(),
        dirtyPlotContents: new Set(),
        isDirty: false,
        isSaving: false,
      });
    } catch (err) {
      console.error('saveAll failed:', err);
      set({ isSaving: false });
      throw err;
    }
  },

  discardPending: () => {
    set({
      pendingCreates: emptyCreates(),
      pendingUpdates: emptyUpdates(),
      pendingDeletes: emptyDeletes(),
      dirtyPlotContents: new Set(),
      isDirty: false,
    });
  },

  // ── Selection ─────────────────────────────────────────────────────────────

  selectWork: (id) => {
    const { isDirty } = get();
    if (isDirty) {
      if (
        !window.confirm(
          '저장되지 않은 변경사항이 있습니다. 작품을 전환하면 변경사항이 사라집니다. 계속하시겠습니까?',
        )
      ) {
        return;
      }
      get().discardPending();
      // Reload works to revert any unsaved creations/deletions
      get().loadWorks();
    }

    const work = get().works.find((w) => w.id === id);
    set({
      selectedWorkId: id,
      selectedEpisodeId: null,
      selectedPlotIds: [],
      planningDoc: work?.planning_doc ?? '',
    });

    get().loadEpisodes(id);
    get().loadCharacters(id);
    get().loadRelations(id);
  },

  selectEpisode: (id) => {
    set({ selectedEpisodeId: id, selectedPlotIds: [] });
    get().loadPlots(id);
  },

  selectPlot: (id, multi = false) => {
    set((s) => {
      if (multi) {
        const already = s.selectedPlotIds.includes(id);
        return {
          selectedPlotIds: already
            ? s.selectedPlotIds.filter((pid) => pid !== id)
            : [...s.selectedPlotIds, id],
        };
      }
      return { selectedPlotIds: [id] };
    });
  },

  selectCharacter: (id) => {
    set({ selectedCharacterId: id, rightPanelMode: id !== null ? 'character' : 'editor' });
  },

  toggleWorkExpand: (id) => {
    set((s) => {
      const next = new Set(s.expandedWorkIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedWorkIds: next };
    });
  },

  toggleEpisodeExpand: (id) => {
    set((s) => {
      const next = new Set(s.expandedEpisodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedEpisodeIds: next };
    });
  },

  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
}));
