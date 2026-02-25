import { create } from 'zustand';
import type { Work, Episode, Plot, Character, CharacterRelation } from '../db';
import * as db from '../db';
import { updatePlanningDoc } from '../db';

interface AppState {
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
  loadWorks: () => Promise<void>;
  loadEpisodes: (workId: number) => Promise<void>;
  loadPlots: (episodeId: number) => Promise<void>;
  loadCharacters: (workId: number) => Promise<void>;
  loadRelations: (workId: number) => Promise<void>;

  createWork: (title: string) => Promise<void>;
  updateWork: (id: number, title: string) => Promise<void>;
  deleteWork: (id: number) => Promise<void>;

  createEpisode: (workId: number, title: string) => Promise<void>;
  updateEpisode: (id: number, title: string) => Promise<void>;
  deleteEpisode: (id: number) => Promise<void>;

  createPlot: (episodeId: number, title: string) => Promise<void>;
  updatePlot: (id: number, title: string, content: string) => Promise<void>;
  reorderPlots: (episodeId: number, plots: Plot[]) => Promise<void>;
  deletePlot: (id: number) => Promise<void>;

  savePlanningDoc: (workId: number, content: string) => Promise<void>;

  createCharacter: (workId: number, name: string, color: string) => Promise<void>;
  updateCharacter: (id: number, name: string, color: string, properties: string, memo?: string, image?: string) => Promise<void>;
  deleteCharacter: (id: number) => Promise<void>;
  createRelation: (fromId: number, toId: number, name: string) => Promise<void>;
  deleteRelation: (id: number) => Promise<void>;

  selectWork: (id: number) => void;
  selectEpisode: (id: number) => void;
  selectPlot: (id: number, multi?: boolean) => void;
  selectCharacter: (id: number | null) => void;
  toggleWorkExpand: (id: number) => void;
  toggleEpisodeExpand: (id: number) => void;
  setRightPanelMode: (mode: 'editor' | 'character' | 'graph' | 'planning') => void;
}

export const useStore = create<AppState>((set, get) => ({
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

  loadWorks: async () => {
    const works = await db.getWorks();
    set({ works });
  },

  loadEpisodes: async (workId) => {
    const episodes = await db.getEpisodes(workId);
    set((s) => ({ episodes: { ...s.episodes, [workId]: episodes } }));
  },

  loadPlots: async (episodeId) => {
    const plots = await db.getPlots(episodeId);
    set((s) => ({ plots: { ...s.plots, [episodeId]: plots } }));
  },

  loadCharacters: async (workId) => {
    const chars = await db.getCharacters(workId);
    set((s) => ({ characters: { ...s.characters, [workId]: chars } }));
  },

  loadRelations: async (workId) => {
    const relations = await db.getAllRelations(workId);
    set({ relations });
  },

  createWork: async (title) => {
    await db.createWork(title);
    await get().loadWorks();
  },

  updateWork: async (id, title) => {
    await db.updateWork(id, title);
    await get().loadWorks();
  },

  deleteWork: async (id) => {
    await db.deleteWork(id);
    await get().loadWorks();
    if (get().selectedWorkId === id) {
      set({ selectedWorkId: null, selectedEpisodeId: null, selectedPlotIds: [] });
    }
  },

  createEpisode: async (workId, title) => {
    const eps = get().episodes[workId] || [];
    await db.createEpisode(workId, title, eps.length);
    await get().loadEpisodes(workId);
  },

  updateEpisode: async (id, title) => {
    await db.updateEpisode(id, title);
    const { selectedWorkId } = get();
    if (selectedWorkId) await get().loadEpisodes(selectedWorkId);
  },

  deleteEpisode: async (id) => {
    await db.deleteEpisode(id);
    const { selectedWorkId } = get();
    if (selectedWorkId) await get().loadEpisodes(selectedWorkId);
    if (get().selectedEpisodeId === id) {
      set({ selectedEpisodeId: null, selectedPlotIds: [] });
    }
  },

  createPlot: async (episodeId, title) => {
    const ps = get().plots[episodeId] || [];
    await db.createPlot(episodeId, title, ps.length);
    await get().loadPlots(episodeId);
  },

  updatePlot: async (id, title, content) => {
    await db.updatePlot(id, title, content);
    const { selectedEpisodeId } = get();
    if (selectedEpisodeId) {
      const plots = get().plots[selectedEpisodeId] || [];
      set((s) => ({
        plots: {
          ...s.plots,
          [selectedEpisodeId]: plots.map((p) =>
            p.id === id ? { ...p, title, content } : p
          ),
        },
      }));
    }
  },

  reorderPlots: async (episodeId, plots) => {
    set((s) => ({ plots: { ...s.plots, [episodeId]: plots } }));
    for (let i = 0; i < plots.length; i++) {
      await db.updatePlotOrder(plots[i].id, i);
    }
  },

  deletePlot: async (id) => {
    await db.deletePlot(id);
    const { selectedEpisodeId } = get();
    if (selectedEpisodeId) await get().loadPlots(selectedEpisodeId);
    set((s) => ({ selectedPlotIds: s.selectedPlotIds.filter((pid) => pid !== id) }));
  },

  createCharacter: async (workId, name, color) => {
    await db.createCharacter(workId, name, color);
    await get().loadCharacters(workId);
  },

  savePlanningDoc: async (workId, content) => {
    set({ planningDoc: content });
    await updatePlanningDoc(workId, content);
  },

  updateCharacter: async (id, name, color, properties, memo = '', image = '') => {
    await db.updateCharacter(id, name, color, properties, memo, image);
    const { selectedWorkId } = get();
    if (selectedWorkId) await get().loadCharacters(selectedWorkId);
  },

  deleteCharacter: async (id) => {
    await db.deleteCharacter(id);
    const { selectedWorkId } = get();
    if (selectedWorkId) {
      await get().loadCharacters(selectedWorkId);
      await get().loadRelations(selectedWorkId);
    }
    if (get().selectedCharacterId === id) set({ selectedCharacterId: null });
  },

  createRelation: async (fromId, toId, name) => {
    await db.createRelation(fromId, toId, name);
    const { selectedWorkId } = get();
    if (selectedWorkId) await get().loadRelations(selectedWorkId);
  },

  deleteRelation: async (id) => {
    await db.deleteRelation(id);
    const { selectedWorkId } = get();
    if (selectedWorkId) await get().loadRelations(selectedWorkId);
  },

  selectWork: (id) => {
    set({ selectedWorkId: id, selectedEpisodeId: null, selectedPlotIds: [] });
    get().loadEpisodes(id);
    get().loadCharacters(id);
    get().loadRelations(id);
    // Load planning doc
    db.getWorks().then((works) => {
      const work = works.find((w) => w.id === id);
      set({ planningDoc: work?.planning_doc ?? '' });
    });
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
