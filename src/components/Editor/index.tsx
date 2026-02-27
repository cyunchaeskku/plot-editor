import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { SceneHeading, Dialogue, Narration, StageDirection } from './nodes';
import Underline from '@tiptap/extension-underline';
import SlashMenu from './SlashMenu';
import { useStore } from '../../store';

interface SlashMenuState {
  visible: boolean;
  position: { top: number; left: number };
}

function PlotTag({ plotId, index, isActive, onClick }: {
  plotId: number;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const { plots, selectedEpisodeId } = useStore();
  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];
  const plot = episodePlots.find((p) => p.id === plotId);
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
      }`}
    >
      P{index + 1} {plot?.title ? `· ${plot.title}` : ''}
    </button>
  );
}

export default function Editor() {
  const {
    selectedPlotIds,
    plots,
    selectedEpisodeId,
    selectedWorkId,
    characters,
    setPlotContent,
    selectPlot,
  } = useStore();

  const [activePlotId, setActivePlotId] = useState<number | null>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({ visible: false, position: { top: 0, left: 0 } });
  const [showDialogueMenu, setShowDialogueMenu] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<{ top: number; line: number }[]>([]);
  const dialogueMenuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const isRenumberingRef = useRef(false);

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

  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];

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
      attributes: {
        class: 'tiptap-editor focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current) return;

      // 씬 헤딩 자동 번호 재정렬
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

      if (!activePlotId) return;

      // Check for slash trigger
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
        setSlashMenu({
          visible: true,
          position: { top: menuTop, left: coords.left },
        });
      } else {
        setSlashMenu((s) => ({ ...s, visible: false }));
      }

      // Update store content immediately (no debounce — Save button persists)
      const content = JSON.stringify(editor.getJSON());
      prevContentRef.current = content;
      setPlotContent(activePlotId, content);
    },
  });

  const loadPlotContent = useCallback((plotContent: string) => {
    if (!editor) return;
    isLoadingRef.current = true;
    try {
      const content = JSON.parse(plotContent);
      if (content && Object.keys(content).length > 0) {
        editor.commands.setContent(content);
      } else {
        editor.commands.setContent('<p></p>');
      }
    } catch {
      editor.commands.setContent('<p></p>');
    }
    setTimeout(() => { isLoadingRef.current = false; }, 50);
  }, [editor]);

  // Load plot content when activePlotId changes
  useEffect(() => {
    if (!editor || !activePlotId) return;
    const plot = episodePlots.find((p) => p.id === activePlotId);
    if (!plot) return;
    loadPlotContent(plot.content);
  }, [activePlotId]);

  // Reload if store content changes externally (e.g. character color sync)
  const activePlotContent = activePlotId
    ? episodePlots.find((p) => p.id === activePlotId)?.content
    : undefined;
  const prevContentRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!editor || !activePlotId || isLoadingRef.current) return;
    if (activePlotContent === undefined) return;
    if (prevContentRef.current === undefined) {
      prevContentRef.current = activePlotContent;
      return;
    }
    if (activePlotContent !== prevContentRef.current) {
      prevContentRef.current = activePlotContent;
      loadPlotContent(activePlotContent);
    }
  }, [activePlotContent]);

  // Subscribe to editor updates for line numbers
  useEffect(() => {
    if (!editor) return;
    const handler = () => setTimeout(updateLineNumbers, 0);
    editor.on('update', handler);
    handler();
    return () => { editor.off('update', handler); };
  }, [editor, updateLineNumbers]);

  // Set active plot to first selected when selection changes
  useEffect(() => {
    if (selectedPlotIds.length > 0) {
      if (!activePlotId || !selectedPlotIds.includes(activePlotId)) {
        setActivePlotId(selectedPlotIds[0]);
      }
    } else {
      setActivePlotId(null);
    }
  }, [selectedPlotIds]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Shift+Enter: split plot (create new plot)
    if (e.key === 'Enter' && e.shiftKey && selectedEpisodeId) {
      e.preventDefault();
      // TODO: split current plot at cursor
      return;
    }
  }, [selectedEpisodeId]);

  if (selectedPlotIds.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">✍️</div>
          <p>플롯 카드를 선택하면 편집할 수 있습니다</p>
          <p className="text-xs mt-2 text-gray-700">Cmd+클릭으로 여러 플롯을 동시에 선택</p>
        </div>
      </div>
    );
  }

  const selectedPlotList = selectedPlotIds
    .map((id) => ({ id, plot: episodePlots.find((p) => p.id === id) }))
    .filter((x) => x.plot);

  return (
    <div className="flex flex-col h-full">
      {/* Plot tabs (when multiple selected) */}
      {selectedPlotIds.length > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 flex-wrap">
          {selectedPlotList.map(({ id }, idx) => {
            const plotIdx = episodePlots.findIndex((p) => p.id === id);
            return (
              <PlotTag
                key={id}
                plotId={id}
                index={plotIdx}
                isActive={id === activePlotId}
                onClick={() => setActivePlotId(id)}
              />
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      {editor && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800">
          <button
            onClick={() => editor.chain().focus().setNode('sceneHeading').run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${editor.isActive('sceneHeading') ? 'bg-purple-700 text-purple-200' : 'text-gray-500 hover:bg-gray-700'}`}
          >씬</button>
          <div className="relative" ref={dialogueMenuRef}>
            <button
              onMouseDown={(e) => {
                e.preventDefault(); // 에디터 selection 유지
                const chars = selectedWorkId ? (characters[selectedWorkId] || []) : [];
                if (chars.length === 0) {
                  editor.chain().focus().setNode('dialogue', { characterName: '', characterColor: '#6366f1' }).run();
                } else {
                  setShowDialogueMenu((v) => !v);
                }
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${editor.isActive('dialogue') ? 'bg-indigo-700 text-indigo-200' : 'text-gray-500 hover:bg-gray-700'}`}
            >대사</button>
            {showDialogueMenu && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-600 rounded shadow-lg min-w-[120px]">
                {(selectedWorkId ? (characters[selectedWorkId] || []) : []).map((char) => (
                  <button
                    key={char.id}
                    onMouseDown={(e) => {
                      e.preventDefault(); // 에디터 포커스 유지
                      editor.chain().focus().setNode('dialogue', { characterName: char.name, characterColor: char.color }).run();
                      setShowDialogueMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: char.color }} />
                    {char.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => editor.chain().focus().setNode('narration').run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${editor.isActive('narration') ? 'bg-gray-600 text-gray-200' : 'text-gray-500 hover:bg-gray-700'}`}
          >나레이션</button>
          <button
            onClick={() => editor.chain().focus().setNode('stageDirection').run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${editor.isActive('stageDirection') ? 'bg-gray-600 text-gray-200' : 'text-gray-500 hover:bg-gray-700'}`}
          >지문</button>
          <button
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${editor.isActive('paragraph') ? 'bg-gray-600 text-gray-200' : 'text-gray-500 hover:bg-gray-700'}`}
          >단락</button>
          <div className="flex-1" />
          {/* Text formatting */}
          <div className="flex items-center gap-0.5 border-l border-gray-700 pl-2 ml-1">
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              className={`px-2 py-1 text-xs rounded font-bold transition-colors ${editor.isActive('bold') ? 'bg-gray-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
              title="굵게 (Cmd+B)"
            >B</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
              className={`px-2 py-1 text-xs rounded italic transition-colors ${editor.isActive('italic') ? 'bg-gray-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
              title="기울임 (Cmd+I)"
            >I</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
              className={`px-2 py-1 text-xs rounded underline transition-colors ${editor.isActive('underline') ? 'bg-gray-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
              title="밑줄 (Cmd+U)"
            >U</button>
            <button
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
              className={`px-2 py-1 text-xs rounded line-through transition-colors ${editor.isActive('strike') ? 'bg-gray-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
              title="취소선"
            >S</button>
          </div>
          <span className="text-xs text-gray-700 ml-2">/ 로 서식 선택</span>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
        <div ref={editorContainerRef} className="relative">
          {/* Line number gutter */}
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

      {/* Slash menu */}
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
