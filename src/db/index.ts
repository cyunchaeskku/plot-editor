import { openDB, IDBPDatabase } from 'idb';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB('plotEditorDB', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const works = db.createObjectStore('works', { keyPath: 'id', autoIncrement: true });
          works.createIndex('created_at', 'created_at');

          const episodes = db.createObjectStore('episodes', { keyPath: 'id', autoIncrement: true });
          episodes.createIndex('work_id', 'work_id');

          const plots = db.createObjectStore('plots', { keyPath: 'id', autoIncrement: true });
          plots.createIndex('episode_id', 'episode_id');

          const characters = db.createObjectStore('characters', { keyPath: 'id', autoIncrement: true });
          characters.createIndex('work_id', 'work_id');

          const relations = db.createObjectStore('characterRelations', { keyPath: 'id', autoIncrement: true });
          relations.createIndex('from_character_id', 'from_character_id');
        }
        // v2: add 'type' field to existing works (handled after upgrade via migrateWorksType)
      },
    });
    // Migrate existing works that lack a 'type' field
    dbPromise.then(async (db) => {
      const tx = db.transaction('works', 'readwrite');
      const store = tx.objectStore('works');
      const allWorks = await store.getAll();
      for (const work of allWorks) {
        if (!(work as any).type) {
          await store.put({ ...work, type: 'plot' });
        }
      }
      await tx.done;
    });
  }
  return dbPromise;
}

// Works
export async function getWorks(): Promise<Work[]> {
  const db = await getDb();
  const all = await db.getAll('works') as Work[];
  return all.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function createWork(title: string, type: WorkType = 'plot'): Promise<number> {
  const db = await getDb();
  const id = await db.add('works', {
    title,
    type,
    created_at: new Date().toISOString(),
    planning_doc: '',
  } as Omit<Work, 'id'>);
  return id as number;
}

export async function updateWorkType(id: number, type: WorkType): Promise<void> {
  const db = await getDb();
  const work = await db.get('works', id) as Work;
  if (!work) return;
  await db.put('works', { ...work, type });
}

export async function updateWork(id: number, title: string): Promise<void> {
  const db = await getDb();
  const work = await db.get('works', id) as Work;
  if (!work) return;
  await db.put('works', { ...work, title });
}

export async function updatePlanningDoc(id: number, content: string): Promise<void> {
  const db = await getDb();
  const work = await db.get('works', id) as Work;
  if (!work) return;
  await db.put('works', { ...work, planning_doc: content });
}

export async function deleteWork(id: number): Promise<void> {
  const db = await getDb();
  // Cascade: delete episodes + plots
  const eps = await db.getAllFromIndex('episodes', 'work_id', id) as Episode[];
  for (const ep of eps) {
    const plots = await db.getAllFromIndex('plots', 'episode_id', ep.id) as Plot[];
    for (const plot of plots) {
      await db.delete('plots', plot.id);
    }
    await db.delete('episodes', ep.id);
  }
  // Cascade: delete characters + relations
  const chars = await db.getAllFromIndex('characters', 'work_id', id) as Character[];
  for (const char of chars) {
    const rels = await db.getAllFromIndex('characterRelations', 'from_character_id', char.id) as CharacterRelation[];
    for (const rel of rels) {
      await db.delete('characterRelations', rel.id);
    }
    await db.delete('characters', char.id);
  }
  // Delete incoming relations for this work's characters
  const allRels = await db.getAll('characterRelations') as CharacterRelation[];
  const charIds = new Set(chars.map((c) => c.id));
  for (const rel of allRels) {
    if (charIds.has(rel.to_character_id)) {
      await db.delete('characterRelations', rel.id);
    }
  }
  await db.delete('works', id);
}

// Episodes
export async function getEpisodes(workId: number): Promise<Episode[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('episodes', 'work_id', workId) as Episode[];
  return all.sort((a, b) => a.order_index - b.order_index);
}

export async function createEpisode(workId: number, title: string, orderIndex: number): Promise<number> {
  const db = await getDb();
  const id = await db.add('episodes', { work_id: workId, title, order_index: orderIndex } as Omit<Episode, 'id'>);
  return id as number;
}

export async function updateEpisode(id: number, title: string): Promise<void> {
  const db = await getDb();
  const ep = await db.get('episodes', id) as Episode;
  if (!ep) return;
  await db.put('episodes', { ...ep, title });
}

export async function updateEpisodeOrder(id: number, orderIndex: number): Promise<void> {
  const db = await getDb();
  const ep = await db.get('episodes', id) as Episode;
  if (!ep) return;
  await db.put('episodes', { ...ep, order_index: orderIndex });
}

export async function deleteEpisode(id: number): Promise<void> {
  const db = await getDb();
  const plots = await db.getAllFromIndex('plots', 'episode_id', id) as Plot[];
  for (const plot of plots) {
    await db.delete('plots', plot.id);
  }
  await db.delete('episodes', id);
}

// Plots
export async function getPlots(episodeId: number): Promise<Plot[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('plots', 'episode_id', episodeId) as Plot[];
  return all.sort((a, b) => a.order_index - b.order_index);
}

export async function createPlot(episodeId: number, title: string, orderIndex: number): Promise<number> {
  const db = await getDb();
  const id = await db.add('plots', {
    episode_id: episodeId,
    title,
    content: '{}',
    order_index: orderIndex,
  } as Omit<Plot, 'id'>);
  return id as number;
}

export async function updatePlot(id: number, title: string, content: string): Promise<void> {
  const db = await getDb();
  const plot = await db.get('plots', id) as Plot;
  if (!plot) return;
  await db.put('plots', { ...plot, title, content });
}

export async function updatePlotOrder(id: number, orderIndex: number): Promise<void> {
  const db = await getDb();
  const plot = await db.get('plots', id) as Plot;
  if (!plot) return;
  await db.put('plots', { ...plot, order_index: orderIndex });
}

export async function deletePlot(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('plots', id);
}

// Characters
export async function getCharacters(workId: number): Promise<Character[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('characters', 'work_id', workId) as Character[];
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCharacter(workId: number, name: string, color: string): Promise<number> {
  const db = await getDb();
  const id = await db.add('characters', {
    work_id: workId,
    name,
    color,
    properties: '{}',
    memo: '',
    image: '',
  } as Omit<Character, 'id'>);
  return id as number;
}

export async function updateCharacter(id: number, name: string, color: string, properties: string, memo: string = '', image: string = ''): Promise<void> {
  const db = await getDb();
  const char = await db.get('characters', id) as Character;
  if (!char) return;
  await db.put('characters', { ...char, name, color, properties, memo, image });
}

export async function deleteCharacter(id: number): Promise<void> {
  const db = await getDb();
  const rels = await db.getAllFromIndex('characterRelations', 'from_character_id', id) as CharacterRelation[];
  for (const rel of rels) {
    await db.delete('characterRelations', rel.id);
  }
  // Also delete incoming relations
  const allRels = await db.getAll('characterRelations') as CharacterRelation[];
  for (const rel of allRels) {
    if (rel.to_character_id === id) {
      await db.delete('characterRelations', rel.id);
    }
  }
  await db.delete('characters', id);
}

// Character Relations
export async function getRelations(characterId: number): Promise<CharacterRelation[]> {
  const db = await getDb();
  const rels = await db.getAllFromIndex('characterRelations', 'from_character_id', characterId) as CharacterRelation[];
  const enriched: CharacterRelation[] = [];
  for (const rel of rels) {
    const toChar = await db.get('characters', rel.to_character_id) as Character | undefined;
    enriched.push({ ...rel, to_name: toChar?.name, to_color: toChar?.color });
  }
  return enriched;
}

export async function getAllRelations(workId: number): Promise<CharacterRelation[]> {
  const db = await getDb();
  const chars = await db.getAllFromIndex('characters', 'work_id', workId) as Character[];
  const charMap = new Map(chars.map((c) => [c.id, c]));
  const charIds = new Set(chars.map((c) => c.id));

  const allRels = await db.getAll('characterRelations') as CharacterRelation[];
  const result: CharacterRelation[] = [];
  for (const rel of allRels) {
    if (!charIds.has(rel.from_character_id)) continue;
    const fromChar = charMap.get(rel.from_character_id);
    const toChar = charMap.get(rel.to_character_id);
    result.push({
      ...rel,
      from_name: fromChar?.name,
      from_color: fromChar?.color,
      to_name: toChar?.name,
      to_color: toChar?.color,
    });
  }
  return result;
}

export async function createRelation(fromId: number, toId: number, relationName: string): Promise<number> {
  const db = await getDb();
  const id = await db.add('characterRelations', {
    from_character_id: fromId,
    to_character_id: toId,
    relation_name: relationName,
  } as Omit<CharacterRelation, 'id' | 'from_name' | 'from_color' | 'to_name' | 'to_color'>);
  return id as number;
}

export async function deleteRelation(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('characterRelations', id);
}

// Types
export type WorkType = 'plot' | 'novel';

export interface Work {
  id: number;
  title: string;
  type: WorkType;
  created_at: string;
  planning_doc?: string;
}

export interface Episode {
  id: number;
  work_id: number;
  title: string;
  order_index: number;
}

export interface Plot {
  id: number;
  episode_id: number;
  title: string;
  content: string;
  order_index: number;
}

export interface Character {
  id: number;
  work_id: number;
  name: string;
  color: string;
  properties: string;
  memo: string;
  image?: string;
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
