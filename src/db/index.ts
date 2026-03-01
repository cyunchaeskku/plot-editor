// Types only — all persistence goes through src/api/index.ts + Zustand store
export type WorkType = 'plot' | 'novel';

// ── Community content snapshot types ──────────────────────────────────────────

export interface PostDialogue {
  character_name: string;
  character_color: string;
  text: string;
}

export interface PlotContentPreview {
  scene_heading: string;
  scene_location: string;
  scene_time: string;
  dialogues: PostDialogue[];
}

export type PlotBlockType = 'dialogue' | 'narration' | 'stage_direction';

export interface PlotBlock {
  type: PlotBlockType;
  character_name?: string;
  character_color?: string;
  text: string;
}

export interface PlotScene {
  scene_heading: string;
  scene_location: string;
  scene_time: string;
  blocks: PlotBlock[];
}

export interface PlotFullContent {
  type: 'plot';
  scenes: PlotScene[];
}

export interface NovelContentPreview {
  chapter_title: string;
  excerpt: string;
}

export interface NovelFullContent {
  type: 'novel';
  chapter_title: string;
  paragraphs: string[];
}

// ── Community post / comment ───────────────────────────────────────────────────

interface BaseCommunityPost {
  id: string;
  author_sub: string;
  author_name: string;
  author_color: string;
  work_id: number;
  work_title: string;
  episode_title: string;
  post_title: string;
  description: string;
  tags: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface PlotCommunityPost extends BaseCommunityPost {
  work_type: 'plot';
  content_preview: PlotContentPreview;
}

export interface NovelCommunityPost extends BaseCommunityPost {
  work_type: 'novel';
  content_preview: NovelContentPreview;
}

export type CommunityPost = PlotCommunityPost | NovelCommunityPost;

export interface CommunityComment {
  id: string;
  post_id: string;
  author_sub: string;
  author_name: string;
  author_color: string;
  text: string;
  like_count: number;
  created_at: string;
}

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
