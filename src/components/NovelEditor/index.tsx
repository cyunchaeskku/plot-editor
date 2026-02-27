import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import CharacterCount from '@tiptap/extension-character-count';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak as DocxPageBreak } from 'docx';
import { useStore } from '../../store';
import { LineHeight } from './extensions/LineHeight';
import { PageBreak } from './extensions/PageBreak';
import { FindReplace } from './extensions/FindReplace';
import { FontSize, FontFamily, TabIndent, DOCX_FONT_MAP } from './extensions/sharedExtensions';
import NovelEditorToolbar from './NovelEditorToolbar';

interface NovelEditorProps {
  chapterPlotId: number | null;
}

export default function NovelEditor({ chapterPlotId }: NovelEditorProps) {
  const { plots, selectedEpisodeId, setPlotContent, selectedWorkId, works, episodes } = useStore();
  const isLoadingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showFindReplace, setShowFindReplace] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCount, setMatchCount] = useState(0);

  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];
  const currentPlot = chapterPlotId ? episodePlots.find((p) => p.id === chapterPlotId) : null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      FontFamily,
      TabIndent,
      CharacterCount,
      LineHeight,
      PageBreak,
      FindReplace,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'novel-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current || !chapterPlotId) return;
      const content = JSON.stringify(editor.getJSON());
      setPlotContent(chapterPlotId, content);
    },
  });

  // Load content when chapterPlotId changes
  useEffect(() => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      if (currentPlot && currentPlot.content && currentPlot.content !== '{}') {
        const parsed = JSON.parse(currentPlot.content);
        editor.commands.setContent(parsed);
      } else {
        editor.commands.setContent('<p></p>');
      }
    } catch {
      editor.commands.setContent('<p></p>');
    }
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  }, [chapterPlotId, editor]);

  // Reload if external content changes
  const plotContent = currentPlot?.content;
  const prevContentRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!editor || !chapterPlotId || isLoadingRef.current) return;
    if (plotContent === undefined) return;
    if (prevContentRef.current === undefined) {
      prevContentRef.current = plotContent;
      return;
    }
    if (plotContent !== prevContentRef.current) {
      prevContentRef.current = plotContent;
      isLoadingRef.current = true;
      try {
        const parsed = JSON.parse(plotContent!);
        editor.commands.setContent(parsed);
      } catch {
        editor.commands.setContent('<p></p>');
      }
      setTimeout(() => { isLoadingRef.current = false; }, 50);
    }
  }, [plotContent]);

  // Cmd+F → open find & replace; Escape → close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }
      if (e.key === 'Escape' && showFindReplace) {
        setShowFindReplace(false);
        editor?.commands.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace, editor]);

  // Clear decorations when panel closes
  useEffect(() => {
    if (!showFindReplace && editor) {
      (editor.commands as any).setSearchTerm('');
      setMatchCount(0);
    }
  }, [showFindReplace]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (editor) {
      (editor.commands as any).setSearchTerm(term);
      setMatchCount((editor as any).storage.findReplace?.matchCount ?? 0);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!editor || !selectedWorkId) return;
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
            const lineHeightTwips = lineHeightStr
              ? Math.round(parseFloat(lineHeightStr) * 240)
              : undefined;

            switch (node.type) {
              case 'heading': {
                const level = node.attrs?.level ?? 1;
                const hMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
                  1: HeadingLevel.HEADING_1,
                  2: HeadingLevel.HEADING_2,
                  3: HeadingLevel.HEADING_3,
                };
                children.push(new Paragraph({
                  children: makeRuns(node),
                  heading: hMap[level] ?? HeadingLevel.HEADING_1,
                  alignment,
                }));
                break;
              }
              case 'bulletList':
              case 'orderedList':
                (node.content || []).forEach((li: any) => {
                  children.push(new Paragraph({
                    children: makeRuns(li.content?.[0] ?? li),
                    bullet: { level: 0 },
                  }));
                });
                break;
              default:
                children.push(new Paragraph({
                  children: makeRuns(node),
                  spacing: {
                    after: 80,
                    ...(lineHeightTwips ? { line: lineHeightTwips } : {}),
                  },
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
  }, [editor, selectedWorkId, works, episodes, plots]);

  // ─── Empty state ─────────────────────────────────────────────────────────

  if (!selectedEpisodeId || !chapterPlotId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📖</div>
          <p>챕터를 선택하면 집필할 수 있습니다</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full relative">

      <NovelEditorToolbar
        editor={editor}
        onFindReplaceToggle={() => {
          setShowFindReplace((v) => !v);
          if (!showFindReplace) setTimeout(() => searchInputRef.current?.focus(), 0);
        }}
        showFindReplace={showFindReplace}
        onExport={handleExport}
      />

      {/* ── Find & Replace panel ── */}
      {showFindReplace && (
        <div className="absolute right-4 z-30 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-72" style={{ top: '52px' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">찾기 및 바꾸기</span>
            <button
              onClick={() => { setShowFindReplace(false); editor?.commands.focus(); }}
              className="text-gray-400 hover:text-gray-600 text-base leading-none px-1"
            >✕</button>
          </div>

          <div className="flex gap-1 mb-1">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="찾기..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editor && (editor.commands as any).findNext();
                }
              }}
              className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded outline-none focus:border-indigo-400"
            />
            <button
              onClick={() => editor && (editor.commands as any).findPrev()}
              title="이전 찾기"
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >↑</button>
            <button
              onClick={() => editor && (editor.commands as any).findNext()}
              title="다음 찾기"
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >↓</button>
          </div>

          {matchCount > 0 && (
            <div className="text-[10px] text-gray-400 mb-1">{matchCount}개 일치</div>
          )}

          <div className="flex gap-1 mb-2">
            <input
              type="text"
              placeholder="바꾸기..."
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editor && (editor.commands as any).replaceOne(replaceTerm);
                }
              }}
              className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => editor && (editor.commands as any).replaceOne(replaceTerm)}
              className="flex-1 text-xs px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded"
            >바꾸기</button>
            <button
              onClick={() => editor && (editor.commands as any).replaceAll(replaceTerm)}
              className="flex-1 text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
            >모두 바꾸기</button>
          </div>
        </div>
      )}

      {/* ── A4 paper scroll area ── */}
      <div className="flex-1 overflow-y-auto bg-gray-100 py-8">
        <div className="max-w-[794px] mx-auto bg-white shadow-lg">
          <div className="px-20 py-16">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* ── Status bar ── */}
      {editor && (
        <div className="h-8 flex items-center justify-end gap-3 px-4 bg-white border-t border-gray-200 flex-shrink-0">
          <span className="text-[11px] text-gray-400">
            {(editor as any).storage.characterCount?.characters?.() ?? 0} 자
          </span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">
            {(editor as any).storage.characterCount?.words?.() ?? 0} 단어
          </span>
        </div>
      )}
    </div>
  );
}
