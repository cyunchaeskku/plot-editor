import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { LineHeight } from './extensions/LineHeight';
import { PageBreak } from './extensions/PageBreak';
import { FontSize, FontFamily, TabIndent } from './extensions/sharedExtensions';
import { useStore } from '../../store';
import type { Episode } from '../../db';

interface ChapterEditorSectionProps {
  episode: Episode;
  plotId: number;
  sectionRef: (el: HTMLDivElement | null) => void;
  onActivate: (editor: Editor) => void;
  onTransaction: () => void;
}

export default function ChapterEditorSection({
  episode,
  plotId,
  sectionRef,
  onActivate,
  onTransaction,
}: ChapterEditorSectionProps) {
  const { plots, updatePlot } = useStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  const plot = (plots[episode.id] || []).find((p) => p.id === plotId);

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
      LineHeight,
      PageBreak,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'novel-editor focus:outline-none',
      },
    },
    onFocus: () => {
      if (editor) onActivate(editor);
    },
    onTransaction: ({ editor }) => {
      if (editor.isFocused) onTransaction();
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current || !plotId) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const content = JSON.stringify(editor.getJSON());
        const currentPlot = useStore.getState().plots[episode.id]?.find((p) => p.id === plotId);
        if (currentPlot) {
          updatePlot(plotId, currentPlot.title, content);
        }
      }, 500);
    },
  });

  // Load content when plotId changes or plot content is first available
  useEffect(() => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      if (plot && plot.content && plot.content !== '{}') {
        const parsed = JSON.parse(plot.content);
        editor.commands.setContent(parsed);
      } else {
        editor.commands.setContent('<p></p>');
      }
    } catch {
      editor.commands.setContent('<p></p>');
    }
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  }, [plotId, editor]);

  return (
    <div ref={sectionRef}>
      {/* Chapter divider */}
      <div className="max-w-[794px] mx-auto px-20 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-sm font-semibold text-gray-500 px-2">{episode.title}</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>
      </div>

      {/* Editor area (A4 style, consistent with single chapter view) */}
      <div className="max-w-[794px] mx-auto bg-white shadow-lg mb-8">
        <div className="px-20 py-16">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
