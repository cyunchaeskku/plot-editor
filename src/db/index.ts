// Types only — all persistence goes through src/api/index.ts + Zustand store
export type WorkType = 'plot' | 'novel';

export interface Work {
  id: number;
  title: string;
  type: WorkType;
  created_at: string;
  planning_doc?: string;
  work_summary?: string;
}

export interface Episode {
  id: number;
  work_id: number;
  title: string;
  order_index: number;
  chapter_summary?: string;
}

export interface Plot {
  id: number;
  episode_id: number;
  title: string;
  content: string;
  order_index: number;
  plot_summary?: string;
}

export interface Character {
  id: number;
  work_id: number;
  name: string;
  color: string;
  properties: string;
  memo: string;
  image?: string;
  ai_summary?: string;
}

export interface CharacterRelation {
  id: number;
  from_character_id: number;
  to_character_id: number;
  relation_name: string;
  from_name?: string;
  from_color?: string;
  to_name?: string;
  to_color?: string;
}
