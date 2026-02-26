import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../../store';
import type { Plot } from '../../db';

function PlotCard({ plot, index, isSelected, onClick, onDelete }: {
  plot: Plot;
  index: number;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: plot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Parse content to get a preview
  let preview = '';
  try {
    const content = JSON.parse(plot.content);
    if (content.content) {
      const texts: string[] = [];
      const extractText = (node: any) => {
        if (node.type === 'text') texts.push(node.text || '');
        if (node.content) node.content.forEach(extractText);
      };
      content.content.forEach(extractText);
      preview = texts.join(' ').slice(0, 100);
    }
  } catch {
    preview = '';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        rounded-lg border p-3 cursor-pointer transition-colors mb-2 group
        ${isSelected
          ? 'border-indigo-500 bg-indigo-900/20'
          : 'border-gray-700 bg-[#1a1a35] hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing mt-0.5 text-xs select-none"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-400">P{index + 1}</span>
            <span className="text-sm font-medium text-gray-200 truncate flex-1">
              {plot.title || '(제목 없음)'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm('플롯을 삭제하시겠습니까?')) onDelete(); }}
              className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
            >✕</button>
          </div>
          {preview && (
            <p className="text-xs text-gray-500 truncate">{preview}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlotPanel() {
  const {
    selectedEpisodeId,
    selectedWorkId,
    works,
    plots,
    selectedPlotIds,
    selectPlot,
    reorderPlots,
    createPlot,
    deletePlot,
  } = useStore();

  const currentWork = works.find((w) => w.id === selectedWorkId);

  const [newPlotTitle, setNewPlotTitle] = useState('');
  const [showNewPlot, setShowNewPlot] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const episodePlots = selectedEpisodeId ? (plots[selectedEpisodeId] || []) : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedEpisodeId) return;

    const oldIndex = episodePlots.findIndex((p) => p.id === active.id);
    const newIndex = episodePlots.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(episodePlots, oldIndex, newIndex);
    reorderPlots(selectedEpisodeId, reordered);
  };

  const handleCreate = async () => {
    const title = newPlotTitle.trim();
    if (!selectedEpisodeId || !title) return;
    setNewPlotTitle('');
    setShowNewPlot(false);
    await createPlot(selectedEpisodeId, title);
  };

  if (!selectedEpisodeId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <p>좌측에서 에피소드를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="text-sm font-semibold text-gray-300 truncate">
          {currentWork ? `${currentWork.title} / 플롯 카드` : '플롯 카드'}
        </span>
        <button
          onClick={() => setShowNewPlot(true)}
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >+ 플롯 추가</button>
      </div>

      {/* New plot input */}
      {showNewPlot && (
        <div className="px-4 py-2 flex gap-2 border-b border-gray-800">
          <input
            autoFocus
            value={newPlotTitle}
            onChange={(e) => setNewPlotTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowNewPlot(false); setNewPlotTitle(''); }
            }}
            placeholder="플롯 제목 입력..."
            className="flex-1 bg-gray-800 text-gray-200 rounded px-3 py-1.5 text-sm outline-none border border-gray-600"
          />
          <button onClick={handleCreate} className="text-indigo-400 hover:text-indigo-300 text-sm">추가</button>
          <button onClick={() => setShowNewPlot(false)} className="text-gray-500 text-sm">취소</button>
        </div>
      )}

      {/* Plot list */}
      <div className="flex-1 overflow-y-auto p-4">
        {episodePlots.length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-8">
            <div className="text-3xl mb-2">📝</div>
            <p>플롯이 없습니다</p>
            <button
              onClick={() => setShowNewPlot(true)}
              className="mt-2 text-indigo-400 hover:text-indigo-300 text-xs"
            >+ 첫 번째 플롯 추가</button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={episodePlots.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              {episodePlots.map((plot, index) => (
                <PlotCard
                  key={plot.id}
                  plot={plot}
                  index={index}
                  isSelected={selectedPlotIds.includes(plot.id)}
                  onClick={(e) => selectPlot(plot.id, e.metaKey || e.ctrlKey)}
                  onDelete={() => deletePlot(plot.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
