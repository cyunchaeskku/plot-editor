import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import CharacterCount from '@tiptap/extension-character-count';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak as DocxPageBreak } from 'docx';
import { useStore } from '../../store';
import { LineHeight } from './extensions/LineHeight';
import { PageBreak } from './extensions/PageBreak';
import { FindReplace } from './extensions/FindReplace';

// ─── Inline extensions ──────────────────────────────────────────────────────

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontFamily || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily }).run(),
      unsetFontFamily: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

// Tab key toggles text-indent on paragraphs/headings
const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) return false;
        const { state } = editor;
        const { $from } = state.selection;
        const node = $from.node($from.depth);
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          const currentIndent = node.attrs.textIndent || 0;
          editor.chain().focus().updateAttributes(node.type.name, { textIndent: currentIndent ? 0 : 1 }).run();
          return true;
        }
        return false;
      },
    };
  },
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textIndent: {
          default: 0,
          parseHTML: (el: HTMLElement) => el.style.textIndent ? 1 : 0,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.textIndent ? { style: 'text-indent: 2em' } : {},
        },
      },
    }];
  },
});

// ─── Google Fonts → docx font name map ─────────────────────────────────────

const FONT_FAMILY_OPTIONS = [
  { label: '기본', value: '' },
  { label: 'Noto Sans KR', value: "'Noto Sans KR', sans-serif" },
  { label: '나눔고딕', value: "'Nanum Gothic', sans-serif" },
  { label: '나눔명조', value: "'Nanum Myeongjo', serif" },
  { label: 'Noto Serif KR', value: "'Noto Serif KR', serif" },
  { label: 'Gowun Dodum', value: "'Gowun Dodum', sans-serif" },
];

const DOCX_FONT_MAP: Record<string, string> = {
  "'Noto Sans KR', sans-serif": 'Noto Sans KR',
  "'Nanum Gothic', sans-serif": '나눔고딕',
  "'Nanum Myeongjo', serif": '나눔명조',
  "'Noto Serif KR', serif": 'Noto Serif KR',
  "'Gowun Dodum', sans-serif": 'Gowun Dodum',
};

// ─── Component ───────────────────────────────────────────────────────────────

interface NovelEditorProps {
  chapterPlotId: number | null;
}

export default function NovelEditor({ chapterPlotId }: NovelEditorProps) {
  const { plots, selectedEpisodeId, updatePlot, selectedWorkId, works, episodes } = useStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Toolbar 조작 중 WebKit phantom Enter(insertParagraph) 차단용 플래그
  const suppressPhantomEnterRef = useRef(false);

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
      handleDOMEvents: {
        // toolbar select/input 조작 후 WebKit이 삽입하는 phantom Enter 차단
        beforeinput: (_view, event) => {
          if (suppressPhantomEnterRef.current && (event as InputEvent).inputType === 'insertParagraph') {
            return true;
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current || !chapterPlotId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const content = JSON.stringify(editor.getJSON());
        const plot = episodePlots.find((p) => p.id === chapterPlotId);
        if (plot) {
          updatePlot(chapterPlotId, plot.title, content);
        }
      }, 500);
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
            // Handle page break node
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

            // Line height: 1.8 → 1.8 * 240 = 432 twips
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

  // ─── Toolbar helpers ─────────────────────────────────────────────────────

  const isIndented = editor
    ? !!(editor.getAttributes('paragraph').textIndent || editor.getAttributes('heading').textIndent)
    : false;

  const currentLineHeight =
    editor?.getAttributes('paragraph').lineHeight ||
    editor?.getAttributes('heading').lineHeight ||
    '';

  const currentFontFamily = editor?.getAttributes('textStyle').fontFamily || '';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full relative">

      {/* ── Toolbar ── */}
      {editor && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap sticky top-0 z-20">

          {/* Undo / Redo */}
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
            disabled={!editor.can().undo()}
            title="실행 취소 (Cmd+Z)"
            className="px-2 py-0.5 text-xs rounded transition-colors text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >↩</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
            disabled={!editor.can().redo()}
            title="다시 실행 (Cmd+Shift+Z)"
            className="px-2 py-0.5 text-xs rounded transition-colors text-gray-600 hover:bg-gray-100 disabled:opacity-30"
          >↪</button>

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Font family */}
          <select
            value={currentFontFamily}
            onMouseDown={() => { suppressPhantomEnterRef.current = true; }}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) (editor.chain().focus() as any).unsetFontFamily().run();
              else (editor.chain().focus() as any).setFontFamily(value).run();
              setTimeout(() => { suppressPhantomEnterRef.current = false; }, 200);
            }}
            className="text-xs rounded px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 outline-none max-w-[90px]"
            title="폰트"
          >
            {FONT_FAMILY_OPTIONS.map(({ label, value }) => (
              <option key={label} value={value}>{label}</option>
            ))}
          </select>

          {/* Heading */}
          <select
            value={
              editor.isActive('heading', { level: 1 }) ? '1' :
              editor.isActive('heading', { level: 2 }) ? '2' :
              editor.isActive('heading', { level: 3 }) ? '3' : '0'
            }
            onMouseDown={() => { suppressPhantomEnterRef.current = true; }}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val === 0) editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: val as 1|2|3 }).run();
              setTimeout(() => { suppressPhantomEnterRef.current = false; }, 200);
            }}
            className="text-xs rounded px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 outline-none"
          >
            <option value="0">본문</option>
            <option value="1">제목 1</option>
            <option value="2">제목 2</option>
            <option value="3">제목 3</option>
          </select>

          {/* Font size */}
          <select
            onMouseDown={() => { suppressPhantomEnterRef.current = true; }}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) (editor.chain().focus() as any).unsetFontSize().run();
              else (editor.chain().focus() as any).setFontSize(value).run();
              setTimeout(() => { suppressPhantomEnterRef.current = false; }, 200);
            }}
            className="text-xs rounded px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 outline-none"
          >
            <option value="">크기</option>
            {['12px','14px','16px','18px','20px','24px','28px','32px'].map((s) => (
              <option key={s} value={s}>{parseInt(s)}</option>
            ))}
          </select>

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Text format */}
          {[
            { label: 'B', title: '굵게', cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), cls: 'font-bold' },
            { label: 'I', title: '기울임', cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), cls: 'italic' },
            { label: 'U', title: '밑줄', cmd: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), cls: 'underline' },
            { label: 'S', title: '취소선', cmd: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), cls: 'line-through' },
          ].map(({ label, title, cmd, active, cls }) => (
            <button key={label} onMouseDown={(e) => { e.preventDefault(); cmd(); }} title={title}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${cls} ${active ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{label}</button>
          ))}

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Alignment */}
          {[
            { label: '⬅', title: '왼쪽 정렬', align: 'left' },
            { label: '↔', title: '가운데 정렬', align: 'center' },
            { label: '➡', title: '오른쪽 정렬', align: 'right' },
            { label: '☰', title: '양쪽 정렬', align: 'justify' },
          ].map(({ label, title, align }) => (
            <button key={align} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign(align).run(); }} title={title}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive({ textAlign: align }) ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{label}</button>
          ))}

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Text color */}
          <input
            type="color"
            defaultValue="#000000"
            onMouseDown={() => { suppressPhantomEnterRef.current = true; }}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            onBlur={() => { setTimeout(() => { suppressPhantomEnterRef.current = false; }, 200); }}
            title="텍스트 색상"
            style={{ width: 24, height: 24, padding: 2, cursor: 'pointer', borderRadius: 4, border: '1px solid #d1d5db' }}
          />

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Lists */}
          <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >• 목록</button>
          <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >1. 목록</button>

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Line height */}
          <select
            value={currentLineHeight}
            onMouseDown={() => { suppressPhantomEnterRef.current = true; }}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) (editor.chain().focus() as any).unsetLineHeight().run();
              else (editor.chain().focus() as any).setLineHeight(value).run();
              setTimeout(() => { suppressPhantomEnterRef.current = false; }, 200);
            }}
            title="줄 간격"
            className="text-xs rounded px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 outline-none"
          >
            <option value="">줄 간격</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="1.8">1.8</option>
            <option value="2.0">2.0</option>
          </select>

          {/* Indent toggle */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (!editor) return;
              const { state } = editor;
              const { $from } = state.selection;
              const node = $from.node($from.depth);
              if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                const cur = node.attrs.textIndent || 0;
                editor.chain().focus().updateAttributes(node.type.name, { textIndent: cur ? 0 : 1 }).run();
              }
            }}
            title="들여쓰기 토글 (Tab)"
            className={`px-2 py-0.5 text-xs rounded transition-colors ${isIndented ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >⇥</button>

          {/* Page break */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
            }}
            title="페이지 나누기 (Cmd+Enter)"
            className="px-2 py-0.5 text-xs rounded transition-colors text-gray-600 hover:bg-gray-100"
          >— 쪽</button>

          <div className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Find & replace toggle */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setShowFindReplace((v) => !v);
              if (!showFindReplace) setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            title="찾기 및 바꾸기 (Cmd+F)"
            className={`px-2 py-0.5 text-xs rounded transition-colors ${showFindReplace ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >🔍</button>

          <div className="flex-1" />

          {/* Export */}
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
          >.docx 내보내기</button>
        </div>
      )}

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

          {/* Search row */}
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

          {/* Replace row */}
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
