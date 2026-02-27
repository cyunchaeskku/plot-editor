import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { SceneHeading, Dialogue, Narration, StageDirection } from './nodes';
import SlashMenu from './SlashMenu';
import { useStore } from '../../store';
import type { Plot } from '../../db';

interface SlashMenuState {
  visible: boolean;
  position: { top: number; left: number };
}

interface PlotEditorSectionProps {
  plot: Plot;
  episodeId: number;
  index: number;
  sectionRef: (el: HTMLDivElement | null) => void;
  onActivate: (editor: Editor) => void;
  onTransaction: () => void;
}

export default function PlotEditorSection({
  plot,
  episodeId,
  index,
  sectionRef,
  onActivate,
  onTransaction,
}: PlotEditorSectionProps) {
  const { setPlotContent } = useStore();
  const isLoadingRef = useRef(false);
  const isRenumberingRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({ visible: false, position: { top: 0, left: 0 } });
  const [lineNumbers, setLineNumbers] = useState<{ top: number; line: number }[]>([]);

  const updateLineNumbers = useCallback(() => {
    if (!editorContainerRef.current) return;
    const editorEl = editorContainerRef.current.querySelector('.tiptap-editor');
    if (!editorEl) return;
    const blocks = Array.from(editorEl.children);
    const result: { top: number; line: number }[] = [];
    blocks.forEach((block, i) => {
      const lineNum = i + 1;
      if (lineNum % 5 === 0) {
        result.push({ top: (block as HTMLElement).offsetTop, line: lineNum });
      }
    });
    setLineNumbers(result);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      SceneHeading,
      Dialogue,
      Narration,
      StageDirection,
    ],
    content: '',
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none' },
    },
    onFocus: () => {
      if (editor) onActivate(editor);
    },
    onTransaction: ({ editor }) => {
      if (editor.isFocused) onTransaction();
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current) return;

      // Scene heading auto-renumber
      if (isRenumberingRef.current) {
        isRenumberingRef.current = false;
        return;
      }
      {
        const { state, view } = editor;
        const tr = state.tr;
        let counter = 0;
        let changed = false;
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'sceneHeading') {
            counter++;
            if (node.attrs.sceneNumber !== counter) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, sceneNumber: counter });
              changed = true;
            }
          }
        });
        if (changed) {
          isRenumberingRef.current = true;
          view.dispatch(tr);
        }
      }

      // Slash menu trigger detection
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const textBefore = $from.nodeBefore?.text || '';
      if (textBefore.endsWith('/')) {
        const coords = editor.view.coordsAtPos(selection.from);
        const menuHeight = 280;
        const spaceBelow = window.innerHeight - coords.bottom;
        const menuTop = spaceBelow >= menuHeight + 8
          ? coords.bottom + 4
          : coords.top - menuHeight - 4;
        setSlashMenu({ visible: true, position: { top: menuTop, left: coords.left } });
      } else {
        setSlashMenu((s) => ({ ...s, visible: false }));
      }

      // Update store content immediately (no debounce — Save button persists)
      const content = JSON.stringify(editor.getJSON());
      setPlotContent(plot.id, content);
    },
  });

  // Subscribe editor to line number updates
  useEffect(() => {
    if (!editor) return;
    const handler = () => setTimeout(updateLineNumbers, 0);
    editor.on('update', handler);
    handler();
    return () => { editor.off('update', handler); };
  }, [editor, updateLineNumbers]);

  // Load content when plot changes
  useEffect(() => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      const content = JSON.parse(plot.content);
      if (content && Object.keys(content).length > 0) {
        editor.commands.setContent(content);
      } else {
        editor.commands.setContent('<p></p>');
      }
    } catch {
      editor.commands.setContent('<p></p>');
    }
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  }, [plot.id, editor]);

  return (
    <div ref={sectionRef}>
      {/* Plot divider */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="flex-1 h-px bg-[#2a1208]" />
        <span className="text-xs font-bold text-[#E88D14]">P{index + 1}</span>
        <span className="text-xs text-[#8a6050] max-w-[200px] truncate">{plot.title || '(제목 없음)'}</span>
        <div className="flex-1 h-px bg-[#2a1208]" />
      </div>

      {/* Editor with line number gutter */}
      <div className="px-4 pb-4">
        <div ref={editorContainerRef} className="relative">
          <div className="absolute top-0 left-0 w-10 pointer-events-none select-none">
            {lineNumbers.map(({ top, line }) => (
              <div
                key={line}
                style={{ position: 'absolute', top }}
                className="text-xs text-gray-500 text-right pr-2 leading-6 w-10"
              >
                {line}
              </div>
            ))}
          </div>
          <EditorContent editor={editor} className="h-full" />
        </div>
      </div>

      {/* Slash menu (fixed positioning, scoped to this editor) */}
      {slashMenu.visible && editor && (
        <SlashMenu
          editor={editor}
          position={slashMenu.position}
          onClose={() => setSlashMenu((s) => ({ ...s, visible: false }))}
        />
      )}
    </div>
  );
}
