import type { Work, Episode, Plot, Character, CharacterRelation, WorkType } from '../db';

const BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '';

async function apiFetch(method: string, path: string, body?: unknown): Promise<any> {
  const headers: Record<string, string> = {};
  let bodyStr: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyStr = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
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
  };
}

function normalizeEpisode(item: any): Episode {
  return {
    id: Number(item.local_id),
    work_id: Number(item.work_id),
    title: item.title || '',
    order_index: Number(item.order_index ?? 0),
  };
}

function normalizePlot(item: any, content = '{}'): Plot {
  return {
    id: Number(item.local_id),
    episode_id: Number(item.episode_id),
    title: item.title || '',
    content,
    order_index: Number(item.order_index ?? 0),
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

// ── Plots ──────────────────────────────────────────────────────────────────────

export async function fetchPlots(episodeId: number): Promise<Plot[]> {
  const items = await apiFetch('GET', `/episodes/${episodeId}/plots`);
  return (items as any[])
    .map((item) => normalizePlot(item))
    .sort((a, b) => a.order_index - b.order_index);
}

export async function fetchPlotContent(plotId: number): Promise<string> {
  try {
    const res = await fetch(`${BASE}/plots/${plotId}/content`, { credentials: 'include' });
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
  const res = await fetch(`${BASE}/plots/${id}/content`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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
): Promise<void> {
  await apiFetch('PUT', `/characters/${id}`, { name, color, properties, memo });
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
