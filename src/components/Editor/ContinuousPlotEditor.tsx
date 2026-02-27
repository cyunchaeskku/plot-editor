import React, { useRef, useReducer, useEffect, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useStore } from '../../store';
import PlotEditorSection from './PlotEditorSection';

interface ContinuousPlotEditorProps {
  episodeId: number;
  scrollTargetPlotId: number | null;
  onScrolled: () => void;
}

export default function ContinuousPlotEditor({
  episodeId,
  scrollTargetPlotId,
  onScrolled,
}: ContinuousPlotEditorProps) {
  const { plots, selectedWorkId, characters } = useStore();
  const episodePlots = plots[episodeId] || [];

  const activeEditorRef = useRef<Editor | null>(null);
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [updateKey, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const [showDialogueMenu, setShowDialogueMenu] = useState(false);
  const dialogueMenuRef = useRef<HTMLDivElement>(null);
  const workChars = selectedWorkId ? (characters[selectedWorkId] || []) : [];

  const handleActivate = useCallback((editor: Editor) => {
    activeEditorRef.current = editor;
    forceUpdate();
  }, []);

  const handleTransaction = useCallback(() => {
    if (activeEditorRef.current?.isFocused) forceUpdate();
  }, []);

  // Close dialogue menu on outside click
  useEffect(() => {
    if (!showDialogueMenu) return;
    const handler = (e: MouseEvent) => {
      if (dialogueMenuRef.current && !dialogueMenuRef.current.contains(e.target as Node)) {
        setShowDialogueMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDialogueMenu]);

  // Scroll to target plot when requested
  useEffect(() => {
    if (scrollTargetPlotId === null) return;
    const el = sectionRefs.current[scrollTargetPlotId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onScrolled();
  }, [scrollTargetPlotId, onScrolled]);

  const editor = activeEditorRef.current;

  if (episodePlots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">✍️</div>
          <p>플롯을 추가하면 연속 뷰로 볼 수 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Shared toolbar — keyed to sync with active editor state */}
      <div key={updateKey} className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
        <button
          onClick={() => editor?.chain().focus().setNode('sceneHeading').run()}
          disabled={!editor}
          className={`px-2 py-1 text-xs rounded transition-colors ${editor?.isActive('sceneHeading') ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
        >씬</button>

        <div className="relative" ref={dialogueMenuRef}>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (!editor) return;
              if (workChars.length === 0) {
                editor.chain().focus().setNode('dialogue', { characterName: '', characterColor: '#6366f1' }).run();
              } else {
                setShowDialogueMenu((v) => !v);
              }
            }}
            disabled={!editor}
            className={`px-2 py-1 text-xs rounded transition-colors ${editor?.isActive('dialogue') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
          >대사</button>
          {showDialogueMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded shadow-lg min-w-[120px]">
              {workChars.map((char) => (
                <button
                  key={char.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().setNode('dialogue', { characterName: char.name, characterColor: char.color }).run();
                    setShowDialogueMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 text-left"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                  {char.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => editor?.chain().focus().setNode('narration').run()}
          disabled={!editor}
          className={`px-2 py-1 text-xs rounded transition-colors ${editor?.isActive('narration') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
        >나레이션</button>
        <button
          onClick={() => editor?.chain().focus().setNode('stageDirection').run()}
          disabled={!editor}
          className={`px-2 py-1 text-xs rounded transition-colors ${editor?.isActive('stageDirection') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
        >지문</button>
        <button
          onClick={() => editor?.chain().focus().setParagraph().run()}
          disabled={!editor}
          className={`px-2 py-1 text-xs rounded transition-colors ${editor?.isActive('paragraph') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
        >단락</button>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 border-l border-gray-300 pl-2 ml-1">
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
            disabled={!editor}
            className={`px-2 py-1 text-xs rounded font-bold transition-colors ${editor?.isActive('bold') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
            title="굵게 (Cmd+B)"
          >B</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
            disabled={!editor}
            className={`px-2 py-1 text-xs rounded italic transition-colors ${editor?.isActive('italic') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
            title="기울임 (Cmd+I)"
          >I</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}
            disabled={!editor}
            className={`px-2 py-1 text-xs rounded underline transition-colors ${editor?.isActive('underline') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
            title="밑줄 (Cmd+U)"
          >U</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}
            disabled={!editor}
            className={`px-2 py-1 text-xs rounded line-through transition-colors ${editor?.isActive('strike') ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100 disabled:opacity-30'}`}
            title="취소선"
          >S</button>
        </div>
        <span className="text-xs text-gray-400 ml-2">/ 로 서식 선택</span>
      </div>

      {/* Scrollable plot sections */}
      <div className="flex-1 overflow-y-auto">
        {episodePlots.map((plot, index) => (
          <PlotEditorSection
            key={plot.id}
            plot={plot}
            episodeId={episodeId}
            index={index}
            sectionRef={(el) => { sectionRefs.current[plot.id] = el; }}
            onActivate={handleActivate}
            onTransaction={handleTransaction}
          />
        ))}
      </div>
    </div>
  );
}
