import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { SceneHeading, Dialogue, Narration, StageDirection } from './nodes';
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
    updatePlot,
    selectPlot,
  } = useStore();

  const [activePlotId, setActivePlotId] = useState<number | null>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({ visible: false, position: { top: 0, left: 0 } });
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);

  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
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
      if (!activePlotId) return;

      // Check for slash trigger
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const textBefore = $from.nodeBefore?.text || '';

      if (textBefore.endsWith('/')) {
        const coords = editor.view.coordsAtPos(selection.from);
        setSlashMenu({
          visible: true,
          position: { top: coords.bottom + 4, left: coords.left },
        });
      } else {
        setSlashMenu((s) => ({ ...s, visible: false }));
      }

      // Auto-save with debounce
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const content = JSON.stringify(editor.getJSON());
        const activePlot = episodePlots.find((p) => p.id === activePlotId);
        if (activePlot) {
          updatePlot(activePlotId, activePlot.title, content);
        }
      }, 500);
    },
  });

  // Load plot content when activePlotId changes
  useEffect(() => {
    if (!editor || !activePlotId) return;
    const plot = episodePlots.find((p) => p.id === activePlotId);
    if (!plot) return;

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
  }, [activePlotId]);

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
          <button
            onClick={() => editor.chain().focus().setNode('dialogue', { characterName: '', characterColor: '#6366f1' }).run()}
            className={`px-2 py-1 text-xs rounded transition-colors ${editor.isActive('dialogue') ? 'bg-indigo-700 text-indigo-200' : 'text-gray-500 hover:bg-gray-700'}`}
          >대사</button>
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
          <span className="text-xs text-gray-700">/ 로 서식 선택</span>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto" onKeyDown={handleKeyDown}>
        <EditorContent editor={editor} className="h-full" />
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
