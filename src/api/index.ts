import type { Work, Episode, Plot, Character, CharacterRelation, WorkType, CommunityPost, CommunityComment, PlotFullContent, NovelFullContent } from '../db';

const BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

const TOKEN_KEY = 'plot_editor_token';
export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

async function apiFetch(method: string, path: string, body?: unknown): Promise<any> {
  const headers: Record<string, string> = {};
  let bodyStr: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyStr = JSON.stringify(body);
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: bodyStr,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`API ${method} ${path} → ${res.status}: ${text}`);
    (err as any).status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// ── Normalizers ──────────────────────────────────────────────────────────────

function normalizeWork(item: any): Work {
  return {
    id: Number(item.local_id),
    title: item.title || '',
    type: (item.type as WorkType) || 'plot',
    created_at: item.created_at || '',
    planning_doc: item.planning_doc || '',
    work_summary: item.work_summary || '',
  };
}

function normalizeEpisode(item: any): Episode {
  return {
    id: Number(item.local_id),
    work_id: Number(item.work_id),
    title: item.title || '',
    order_index: Number(item.order_index ?? 0),
    chapter_summary: item.chapter_summary || '',
  };
}

function normalizePlot(item: any, content = '{}'): Plot {
  return {
    id: Number(item.local_id),
    episode_id: Number(item.episode_id),
    title: item.title || '',
    content,
    order_index: Number(item.order_index ?? 0),
    plot_summary: item.plot_summary || undefined,
  };
}

function normalizeCharacter(item: any): Character {
  return {
    id: Number(item.local_id),
    work_id: Number(item.work_id),
    name: item.name || '',
    color: item.color || '#6366f1',
    properties: item.properties || '{}',
    memo: item.memo || '',
    image: item.image || '',
    ai_summary: item.ai_summary || '',
  };
}

function normalizeRelation(item: any): CharacterRelation {
  return {
    id: Number(item.local_id),
    from_character_id: Number(item.from_character_id),
    to_character_id: Number(item.to_character_id),
    relation_name: item.relation_name || '',
  };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function fetchMe(): Promise<{ sub: string; email: string }> {
  return apiFetch('GET', '/me');
}

// ── Works ─────────────────────────────────────────────────────────────────────

export async function fetchWorks(): Promise<Work[]> {
  const items = await apiFetch('GET', '/works');
  const works = (items as any[]).map(normalizeWork);
  return works.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function apiCreateWork(
  id: number,
  title: string,
  type: WorkType,
  planningDoc = '',
): Promise<void> {
  await apiFetch('POST', '/works', { work_id: id, title, type, planning_doc: planningDoc });
}

export async function apiUpdateWork(
  id: number,
  title: string,
  type: WorkType,
  planningDoc = '',
): Promise<void> {
  await apiFetch('PUT', `/works/${id}`, { title, type, planning_doc: planningDoc });
}

export async function apiDeleteWork(id: number): Promise<void> {
  await apiFetch('DELETE', `/works/${id}`);
}

export async function summarizeWork(workId: number, existingSummary = ''): Promise<{ summary: string }> {
  return apiFetch('POST', `/works/${workId}/summarize`, { existing_summary: existingSummary });
}

// ── Episodes ──────────────────────────────────────────────────────────────────

export async function fetchEpisodes(workId: number): Promise<Episode[]> {
  const items = await apiFetch('GET', `/works/${workId}/episodes`);
  return (items as any[])
    .map(normalizeEpisode)
    .sort((a, b) => a.order_index - b.order_index);
}

export async function apiCreateEpisode(
  workId: number,
  id: number,
  title: string,
  orderIndex: number,
): Promise<void> {
  await apiFetch('POST', `/works/${workId}/episodes`, {
    episode_id: id,
    title,
    order_index: orderIndex,
  });
}

export async function apiUpdateEpisode(
  id: number,
  title: string,
  orderIndex: number,
): Promise<void> {
  await apiFetch('PUT', `/episodes/${id}`, { title, order_index: orderIndex });
}

export async function apiDeleteEpisode(id: number): Promise<void> {
  await apiFetch('DELETE', `/episodes/${id}`);
}

export async function summarizeChapter(episodeId: number): Promise<{ summary: string }> {
  return apiFetch('POST', `/episodes/${episodeId}/summarize`);
}

export async function summarizePlot(plotId: number): Promise<{ summary: string }> {
  return apiFetch('POST', `/plots/${plotId}/summarize`);
}

// ── Plots ──────────────────────────────────────────────────────────────────────

export async function fetchPlots(episodeId: number): Promise<Plot[]> {
  const items = await apiFetch('GET', `/episodes/${episodeId}/plots`);
  return (items as any[])
    .map((item) => normalizePlot(item))
    .sort((a, b) => a.order_index - b.order_index);
}

export async function fetchPlotContent(plotId: number): Promise<string> {
  try {
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${BASE}/plots/${plotId}/content`, { headers });
    if (!res.ok) return '{}';
    return (await res.text()) || '{}';
  } catch {
    return '{}';
  }
}

export async function apiCreatePlot(
  episodeId: number,
  id: number,
  title: string,
  orderIndex: number,
): Promise<void> {
  await apiFetch('POST', `/episodes/${episodeId}/plots`, {
    plot_id: id,
    title,
    order_index: orderIndex,
  });
}

export async function apiUpdatePlotMeta(
  id: number,
  title: string,
  orderIndex: number,
): Promise<void> {
  await apiFetch('PUT', `/plots/${id}`, { title, order_index: orderIndex });
}

export async function apiSavePlotContent(id: number, content: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/plots/${id}/content`, {
    method: 'PUT',
    headers,
    body: content,
  });
  if (!res.ok) throw new Error(`PUT /plots/${id}/content → ${res.status}`);
}

export async function apiDeletePlot(id: number): Promise<void> {
  await apiFetch('DELETE', `/plots/${id}`);
}

// ── Characters ─────────────────────────────────────────────────────────────────

export async function fetchCharacters(workId: number): Promise<Character[]> {
  const items = await apiFetch('GET', `/works/${workId}/characters`);
  return (items as any[])
    .map(normalizeCharacter)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function apiCreateCharacter(
  workId: number,
  id: number,
  name: string,
  color: string,
  properties: string,
  memo: string,
): Promise<void> {
  await apiFetch('POST', `/works/${workId}/characters`, {
    character_id: id,
    name,
    color,
    properties,
    memo,
  });
}

export async function apiUpdateCharacter(
  id: number,
  name: string,
  color: string,
  properties: string,
  memo: string,
  aiSummary = '',
): Promise<void> {
  await apiFetch('PUT', `/characters/${id}`, { name, color, properties, memo, ai_summary: aiSummary });
}

export interface CharacterDialogue {
  episode_title: string;
  plot_title: string;
  plot_id: number;
  dialogue_text: string;
}

export async function fetchCharacterDialogues(characterId: number): Promise<CharacterDialogue[]> {
  return apiFetch('GET', `/characters/${characterId}/dialogues`);
}

export async function generateCharacterSummary(characterId: number, existingSummary = ''): Promise<{ summary: string; context: string }> {
  return apiFetch('POST', `/characters/${characterId}/summarize`, { existing_summary: existingSummary });
}

export async function apiDeleteCharacter(id: number): Promise<void> {
  await apiFetch('DELETE', `/characters/${id}`);
}

// ── Relations ──────────────────────────────────────────────────────────────────

export async function fetchRelations(workId: number): Promise<CharacterRelation[]> {
  const items = await apiFetch('GET', `/works/${workId}/relations`);
  return (items as any[]).map(normalizeRelation);
}

export async function apiCreateRelation(
  workId: number,
  id: number,
  fromId: number,
  toId: number,
  name: string,
): Promise<void> {
  await apiFetch('POST', `/works/${workId}/relations`, {
    relation_id: id,
    from_character_id: fromId,
    to_character_id: toId,
    relation_name: name,
  });
}

export async function apiDeleteRelation(id: number): Promise<void> {
  await apiFetch('DELETE', `/relations/${id}`);
}

// ── Community Posts ────────────────────────────────────────────────────────────

function normalizePost(item: any): CommunityPost {
  const base = {
    id: String(item.local_id ?? item.post_id),
    author_sub: item.author_sub ?? '',
    author_name: item.author_name ?? '',
    author_color: item.author_color ?? '#666666',
    work_id: Number(item.work_id ?? 0),
    work_title: item.work_title ?? '',
    episode_title: item.episode_title ?? '',
    post_title: item.post_title ?? '',
    description: item.description ?? '',
    tags: item.tags ?? [],
    view_count: Number(item.view_count ?? 0),
    like_count: Number(item.like_count ?? 0),
    comment_count: Number(item.comment_count ?? 0),
    created_at: item.created_at ?? '',
    content_preview: item.content_preview ?? {},
  };
  if (item.work_type === 'novel') {
    return { ...base, work_type: 'novel', content_preview: item.content_preview ?? { chapter_title: '', excerpt: '' } };
  }
  return { ...base, work_type: 'plot', content_preview: item.content_preview ?? { scene_heading: '', scene_location: '', scene_time: '', dialogues: [] } };
}

function normalizeComment(item: any): CommunityComment {
  return {
    id: String(item.local_id ?? item.comment_id),
    post_id: String(item.post_id),
    author_sub: item.author_sub ?? '',
    author_name: item.author_name ?? '',
    author_color: item.author_color ?? '#666666',
    text: item.text ?? '',
    like_count: Number(item.like_count ?? 0),
    created_at: item.created_at ?? '',
  };
}

export async function fetchPosts(): Promise<CommunityPost[]> {
  const items = await apiFetch('GET', '/posts');
  return (items as any[]).map(normalizePost);
}

export async function fetchMyPosts(): Promise<CommunityPost[]> {
  const items = await apiFetch('GET', '/posts/mine');
  return (items as any[]).map(normalizePost);
}

export interface CreatePostData {
  post_id: number;
  work_id: number;
  work_title: string;
  episode_title: string;
  work_type: WorkType;
  post_title: string;
  description: string;
  tags: string[];
  content_preview: object;
  content_snapshot: PlotFullContent | NovelFullContent;
}

export async function apiCreatePost(data: CreatePostData): Promise<void> {
  await apiFetch('POST', '/posts', data);
}

export async function apiDeletePost(postId: string): Promise<void> {
  await apiFetch('DELETE', `/posts/${postId}`);
}

export async function fetchPostContent(postId: string): Promise<PlotFullContent | NovelFullContent> {
  return apiFetch('GET', `/posts/${postId}/content`);
}

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const items = await apiFetch('GET', `/posts/${postId}/comments`);
  return (items as any[]).map(normalizeComment);
}

export async function apiCreateComment(postId: string, text: string): Promise<void> {
  const commentId = Date.now();
  await apiFetch('POST', `/posts/${postId}/comments`, { comment_id: commentId, text });
}

export async function apiDeleteComment(commentId: string): Promise<void> {
  await apiFetch('DELETE', `/comments/${commentId}`);
}
