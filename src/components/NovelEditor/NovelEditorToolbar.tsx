import React, { useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { FONT_FAMILY_OPTIONS } from './extensions/sharedExtensions';

interface NovelEditorToolbarProps {
  editor: Editor | null;
  onFindReplaceToggle?: () => void;
  showFindReplace?: boolean;
  onExport?: () => void;
}

export default function NovelEditorToolbar({
  editor,
  onFindReplaceToggle,
  showFindReplace,
  onExport,
}: NovelEditorToolbarProps) {
  const suppressPhantomEnterRef = useRef(false);

  if (!editor) return null;

  const isIndented = !!(
    editor.getAttributes('paragraph').textIndent ||
    editor.getAttributes('heading').textIndent
  );
  const currentLineHeight =
    editor.getAttributes('paragraph').lineHeight ||
    editor.getAttributes('heading').lineHeight ||
    '';
  const currentFontFamily = editor.getAttributes('textStyle').fontFamily || '';

  return (
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

      {onFindReplaceToggle && (
        <>
          <div className="w-px h-4 bg-gray-300 mx-0.5" />
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onFindReplaceToggle();
            }}
            title="찾기 및 바꾸기 (Cmd+F)"
            className={`px-2 py-0.5 text-xs rounded transition-colors ${showFindReplace ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >🔍</button>
        </>
      )}

      <div className="flex-1" />

      {onExport && (
        <button
          onClick={onExport}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
        >.docx 내보내기</button>
      )}
    </div>
  );
}
