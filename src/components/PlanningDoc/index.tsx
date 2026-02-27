import React, { useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { useStore } from '../../store';

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => (el as HTMLElement).style.fontSize || null,
          renderHTML: (attrs: Record<string, any>) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
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

export default function PlanningDoc() {
  const { selectedWorkId, works, planningDoc, savePlanningDoc } = useStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      FontSize,
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'planning-editor focus:outline-none',
      },
      handlePaste: (_view, event, _slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (src) editor?.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current || !selectedWorkId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        savePlanningDoc(selectedWorkId, JSON.stringify(editor.getJSON()));
      }, 500);
    },
  });

  // Load content when selectedWorkId changes
  useEffect(() => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      if (planningDoc) {
        const parsed = JSON.parse(planningDoc);
        editor.commands.setContent(parsed);
      } else {
        editor.commands.setContent('<p></p>');
      }
    } catch {
      editor.commands.setContent(`<p>${planningDoc}</p>`);
    }
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  }, [selectedWorkId, editor]);

  const handleExport = useCallback(async () => {
    if (!editor) return;
    const workName = works.find((w) => w.id === selectedWorkId)?.title ?? '기획서';
    const json = editor.getJSON();
    const children: Paragraph[] = [];

    const processNode = (node: any) => {
      const getText = (n: any): string => {
        if (n.type === 'text') return n.text || '';
        if (n.content) return n.content.map(getText).join('');
        return '';
      };
      const makeRuns = (n: any): TextRun[] => {
        if (!n.content) return [];
        return n.content.map((leaf: any) => {
          const textStyleMark = leaf.marks?.find((m: any) => m.type === 'textStyle');
          const colorHex = textStyleMark?.attrs?.color?.replace('#', '');
          const fontSizeStr = textStyleMark?.attrs?.fontSize;
          const halfPoints = fontSizeStr ? Math.round(parseFloat(fontSizeStr) * 2) : undefined;
          return new TextRun({
            text: leaf.text || '',
            bold: leaf.marks?.some((m: any) => m.type === 'bold'),
            italics: leaf.marks?.some((m: any) => m.type === 'italic'),
            underline: leaf.marks?.some((m: any) => m.type === 'underline') ? {} : undefined,
            strike: leaf.marks?.some((m: any) => m.type === 'strike'),
            color: colorHex || undefined,
            size: halfPoints,
          });
        });
      };

      const textAlign = node.attrs?.textAlign;
      const alignment =
        textAlign === 'center' ? AlignmentType.CENTER :
        textAlign === 'right' ? AlignmentType.RIGHT :
        AlignmentType.LEFT;

      switch (node.type) {
        case 'heading': {
          const level = node.attrs?.level ?? 1;
          const hMap: Record<number, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
            1: HeadingLevel.HEADING_1,
            2: HeadingLevel.HEADING_2,
            3: HeadingLevel.HEADING_3,
          };
          children.push(new Paragraph({ children: makeRuns(node), heading: hMap[level] ?? HeadingLevel.HEADING_1, alignment }));
          break;
        }
        case 'bulletList':
        case 'orderedList':
          (node.content || []).forEach(processNode);
          break;
        case 'listItem':
          children.push(new Paragraph({ children: makeRuns(node.content?.[0] ?? node), bullet: { level: 0 } }));
          break;
        case 'blockquote':
          children.push(new Paragraph({
            children: [new TextRun({ text: getText(node), italics: true, color: '6b7280' })],
            indent: { left: 360 },
          }));
          break;
        case 'horizontalRule':
          children.push(new Paragraph({ text: '────────────────────' }));
          break;
        default:
          children.push(new Paragraph({ children: makeRuns(node), spacing: { after: 80 }, alignment }));
      }
    };

    (json.content || []).forEach(processNode);

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workName}_기획서.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, selectedWorkId, works]);

  if (!selectedWorkId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📝</div>
          <p>작품을 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
          {/* Heading */}
          <select
            value={
              editor.isActive('heading', { level: 1 }) ? '1' :
              editor.isActive('heading', { level: 2 }) ? '2' :
              editor.isActive('heading', { level: 3 }) ? '3' : '0'
            }
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val === 0) editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: val as 1|2|3 }).run();
            }}
            className="text-xs rounded px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 outline-none"
          >
            <option value="0">본문</option>
            <option value="1">제목 1</option>
            <option value="2">제목 2</option>
            <option value="3">제목 3</option>
          </select>

          <div className="w-px h-4 bg-gray-300 mx-1" />

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

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Lists */}
          <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >• 목록</button>
          <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >1. 목록</button>
          <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive('blockquote') ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >❝ 인용</button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Alignment */}
          {[
            { label: '⬅', title: '왼쪽 정렬', align: 'left' },
            { label: '↔', title: '가운데 정렬', align: 'center' },
            { label: '➡', title: '오른쪽 정렬', align: 'right' },
          ].map(({ label, title, align }) => (
            <button key={align} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign(align).run(); }} title={title}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${editor.isActive({ textAlign: align }) ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >{label}</button>
          ))}

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Text color */}
          <input
            type="color"
            defaultValue="#000000"
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            title="텍스트 색상"
            style={{ width: 28, height: 28, padding: 2, cursor: 'pointer', borderRadius: 4, border: '1px solid #d1d5db' }}
          />

          {/* Font size */}
          <select
            onMouseDown={(e) => e.preventDefault()}
            onChange={(e) => {
              if (!e.target.value) (editor.chain().focus() as any).unsetFontSize().run();
              else (editor.chain().focus() as any).setFontSize(e.target.value).run();
            }}
            className="text-xs rounded px-1 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 outline-none"
          >
            <option value="">크기</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="28px">28</option>
            <option value="32px">32</option>
          </select>

          <div className="flex-1" />

          {/* Export */}
          <button
            onClick={handleExport}
            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
          >📄 .docx 내보내기</button>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-white">
        <EditorContent editor={editor} className="max-w-3xl mx-auto" />
      </div>
    </div>
  );
}
