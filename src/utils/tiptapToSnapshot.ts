import type {
  WorkType,
  PlotFullContent,
  PlotScene,
  PlotBlock,
  NovelFullContent,
  PlotContentPreview,
  NovelContentPreview,
} from '../db';

// ── TipTap JSON node shapes ────────────────────────────────────────────────────

interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
}

function extractText(node: TipTapNode): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(extractText).join('');
}

// ── Plot conversion ────────────────────────────────────────────────────────────

function convertPlot(nodes: TipTapNode[]): PlotFullContent {
  const scenes: PlotScene[] = [];
  let currentScene: PlotScene | null = null;

  for (const node of nodes) {
    if (node.type === 'sceneHeading') {
      const raw = extractText(node);
      // Parse "S#n HEADING — LOCATION / TIME" or just use raw as heading
      currentScene = {
        scene_heading: raw,
        scene_location: node.attrs?.location ?? '',
        scene_time: node.attrs?.time ?? '',
        blocks: [],
      };
      scenes.push(currentScene);
      continue;
    }

    if (!currentScene) {
      // Content before the first scene heading: create implicit scene
      currentScene = {
        scene_heading: 'S#1',
        scene_location: '',
        scene_time: '',
        blocks: [],
      };
      scenes.push(currentScene);
    }

    if (node.type === 'dialogue') {
      const text = extractText(node);
      if (!text.trim()) continue;
      const block: PlotBlock = {
        type: 'dialogue',
        character_name: node.attrs?.characterName ?? '',
        character_color: node.attrs?.characterColor ?? '#666666',
        text,
      };
      currentScene.blocks.push(block);
    } else if (node.type === 'narration') {
      const text = extractText(node);
      if (!text.trim()) continue;
      currentScene.blocks.push({ type: 'narration', text });
    } else if (node.type === 'stageDirection') {
      const text = extractText(node);
      if (!text.trim()) continue;
      currentScene.blocks.push({ type: 'stage_direction', text });
    } else if (node.type === 'paragraph') {
      // Plain paragraphs are treated as narration
      const text = extractText(node);
      if (!text.trim()) continue;
      currentScene.blocks.push({ type: 'narration', text });
    }
  }

  return { type: 'plot', scenes };
}

// ── Novel conversion ───────────────────────────────────────────────────────────

function convertNovel(nodes: TipTapNode[], chapterTitle: string): NovelFullContent {
  const paragraphs: string[] = [];

  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const text = extractText(node);
      if (text.trim()) paragraphs.push(text);
    } else if (node.type === 'heading') {
      // Skip the chapter title node itself; any sub-headings become paragraphs
      const text = extractText(node);
      if (text.trim() && text !== chapterTitle) paragraphs.push(text);
    }
  }

  return { type: 'novel', chapter_title: chapterTitle, paragraphs };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface SnapshotResult {
  fullContent: PlotFullContent | NovelFullContent;
  contentPreview: PlotContentPreview | NovelContentPreview;
}

/**
 * Convert TipTap JSON (as parsed object) to a community post content snapshot.
 * @param tiptapJson - Parsed TipTap document JSON (the `doc` root or its content array)
 * @param workType - 'plot' or 'novel'
 * @param chapterTitle - For novel mode, the chapter title to embed
 */
export function tiptapToSnapshot(
  tiptapJson: any,
  workType: WorkType,
  chapterTitle = '',
): SnapshotResult {
  // Support both raw doc objects and pre-extracted content arrays
  const nodes: TipTapNode[] = Array.isArray(tiptapJson)
    ? tiptapJson
    : (tiptapJson?.content ?? []);

  if (workType === 'novel') {
    const fullContent = convertNovel(nodes, chapterTitle);
    const excerpt = fullContent.paragraphs[0]?.slice(0, 100) ?? '';
    const contentPreview: NovelContentPreview = {
      chapter_title: chapterTitle,
      excerpt: excerpt.length < (fullContent.paragraphs[0]?.length ?? 0) ? excerpt + '...' : excerpt,
    };
    return { fullContent, contentPreview };
  }

  const fullContent = convertPlot(nodes);
  const firstScene = fullContent.scenes[0];
  const contentPreview: PlotContentPreview = {
    scene_heading: firstScene?.scene_heading ?? '',
    scene_location: firstScene?.scene_location ?? '',
    scene_time: firstScene?.scene_time ?? '',
    dialogues: (firstScene?.blocks ?? [])
      .filter((b) => b.type === 'dialogue')
      .slice(0, 2)
      .map((b) => ({
        character_name: b.character_name ?? '',
        character_color: b.character_color ?? '#666666',
        text: b.text,
      })),
  };
  return { fullContent, contentPreview };
}
