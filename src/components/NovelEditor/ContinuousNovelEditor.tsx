import React, { useRef, useReducer, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { useStore } from '../../store';
import type { Episode } from '../../db';
import NovelEditorToolbar from './NovelEditorToolbar';
import ChapterEditorSection from './ChapterEditorSection';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak as DocxPageBreak } from 'docx';
import { DOCX_FONT_MAP } from './extensions/sharedExtensions';

interface ContinuousNovelEditorProps {
  chapterList: Episode[];
  chapterPlotIds: Record<number, number>;
  scrollTargetEpisodeId: number | null;
  onScrolled: () => void;
}

export default function ContinuousNovelEditor({
  chapterList,
  chapterPlotIds,
  scrollTargetEpisodeId,
  onScrolled,
}: ContinuousNovelEditorProps) {
  const { selectedWorkId, works, episodes, plots } = useStore();
  const activeEditorRef = useRef<Editor | null>(null);
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [updateKey, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const handleActivate = useCallback((editor: Editor) => {
    activeEditorRef.current = editor;
    forceUpdate();
  }, []);

  const handleTransaction = useCallback(() => {
    if (activeEditorRef.current?.isFocused) {
      forceUpdate();
    }
  }, []);

  // Scroll to target chapter when requested
  useEffect(() => {
    if (scrollTargetEpisodeId === null) return;
    const el = sectionRefs.current[scrollTargetEpisodeId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onScrolled();
  }, [scrollTargetEpisodeId, onScrolled]);

  const handleExport = useCallback(async () => {
    if (!selectedWorkId) return;
    const workName = works.find((w) => w.id === selectedWorkId)?.title ?? '소설';
    const workEpisodes = episodes[selectedWorkId] || [];
    const children: Paragraph[] = [];

    for (const ep of workEpisodes) {
      children.push(new Paragraph({
        text: ep.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }));

      const epPlots = plots[ep.id] || [];
      for (const plot of epPlots) {
        try {
          const content = JSON.parse(plot.content);
          if (!content.content) continue;

          for (const node of content.content) {
            if (node.type === 'pageBreak') {
              children.push(new Paragraph({ children: [new DocxPageBreak()] }));
              continue;
            }

            const makeRuns = (n: any): TextRun[] => {
              if (!n.content) return [];
              return n.content.map((leaf: any) => {
                const textStyleMark = leaf.marks?.find((m: any) => m.type === 'textStyle');
                const colorHex = textStyleMark?.attrs?.color?.replace('#', '');
                const fontSizeStr = textStyleMark?.attrs?.fontSize;
                const halfPoints = fontSizeStr ? Math.round(parseFloat(fontSizeStr) * 2) : undefined;
                const fontFamily = textStyleMark?.attrs?.fontFamily;
                const docxFont = fontFamily ? DOCX_FONT_MAP[fontFamily] : undefined;
                return new TextRun({
                  text: leaf.text || '',
                  bold: leaf.marks?.some((m: any) => m.type === 'bold'),
                  italics: leaf.marks?.some((m: any) => m.type === 'italic'),
                  underline: leaf.marks?.some((m: any) => m.type === 'underline') ? {} : undefined,
                  strike: leaf.marks?.some((m: any) => m.type === 'strike'),
                  color: colorHex || undefined,
                  size: halfPoints,
                  font: docxFont ? { name: docxFont } : undefined,
                });
              });
            };

            const textAlign = node.attrs?.textAlign;
            const alignment =
              textAlign === 'center' ? AlignmentType.CENTER :
              textAlign === 'right' ? AlignmentType.RIGHT :
              textAlign === 'justify' ? AlignmentType.JUSTIFIED :
              AlignmentType.LEFT;
            const indent = node.attrs?.textIndent ? { firstLine: 480 } : undefined;
            const lineHeightStr = node.attrs?.lineHeight;
            const lineHeightTwips = lineHeightStr ? Math.round(parseFloat(lineHeightStr) * 240) : undefined;

            switch (node.type) {
              case 'heading': {
                const level = node.attrs?.level ?? 1;
                const hMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
                  1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
                };
                children.push(new Paragraph({ children: makeRuns(node), heading: hMap[level] ?? HeadingLevel.HEADING_1, alignment }));
                break;
              }
              case 'bulletList':
              case 'orderedList':
                (node.content || []).forEach((li: any) => {
                  children.push(new Paragraph({ children: makeRuns(li.content?.[0] ?? li), bullet: { level: 0 } }));
                });
                break;
              default:
                children.push(new Paragraph({
                  children: makeRuns(node),
                  spacing: { after: 80, ...(lineHeightTwips ? { line: lineHeightTwips } : {}) },
                  alignment,
                  indent,
                }));
            }
          }
        } catch {}
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workName}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedWorkId, works, episodes, plots]);

  if (chapterList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📖</div>
          <p>챕터를 추가하면 연속 뷰로 볼 수 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Shared toolbar — keyed to force re-render on active editor change */}
      <NovelEditorToolbar
        key={updateKey}
        editor={activeEditorRef.current}
        onExport={handleExport}
      />

      {/* Scrollable chapter list */}
      <div className="flex-1 overflow-y-auto bg-gray-100 py-4">
        {chapterList.map((ep) => {
          const plotId = chapterPlotIds[ep.id];
          if (!plotId) return null;
          return (
            <ChapterEditorSection
              key={ep.id}
              episode={ep}
              plotId={plotId}
              sectionRef={(el) => { sectionRefs.current[ep.id] = el; }}
              onActivate={handleActivate}
              onTransaction={handleTransaction}
            />
          );
        })}
      </div>
    </div>
  );
}
