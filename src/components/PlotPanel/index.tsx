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
          ? 'border-[#AD1B02] bg-[#3d0c04] border-l-[3px]'
          : 'border-[#2a1208] bg-[#1c0e08] hover:border-[#3a1a0a] border-l-[3px] border-l-transparent'
        }
      `}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="text-[#5a3020] hover:text-[#a07050] cursor-grab active:cursor-grabbing mt-0.5 text-xs select-none"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#E88D14]">P{index + 1}</span>
            <span className="text-sm font-medium text-[#f0ddd0] truncate flex-1">
              {plot.title || '(제목 없음)'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm('플롯을 삭제하시겠습니까?')) onDelete(); }}
              className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
            >✕</button>
          </div>
          {preview && (
            <p className="text-xs text-[#8a6050] truncate">{preview}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlotPanelProps {
  viewMode: 'single' | 'continuous';
  onViewModeChange: (mode: 'single' | 'continuous') => void;
  onScrollTo?: (plotId: number) => void;
}

export default function PlotPanel({ viewMode, onViewModeChange, onScrollTo }: PlotPanelProps) {
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
      <div className="flex-1 flex items-center justify-center text-[#8a5535] text-sm">
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a1208]">
        <span className="text-sm font-semibold text-[#e8d0c0] truncate">
          {currentWork ? `${currentWork.title} / 플롯 카드` : '플롯 카드'}
        </span>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded overflow-hidden border border-[#3a1a0a]">
            <button
              onClick={() => onViewModeChange('single')}
              className={`px-2 py-0.5 text-xs transition-colors ${viewMode === 'single' ? 'bg-[#AD1B02] text-[#f0ddd0]' : 'text-[#8a5535] hover:text-[#e8d0c0]'}`}
              title="단일 플롯 뷰"
            >단일</button>
            <button
              onClick={() => onViewModeChange('continuous')}
              className={`px-2 py-0.5 text-xs transition-colors ${viewMode === 'continuous' ? 'bg-[#AD1B02] text-[#f0ddd0]' : 'text-[#8a5535] hover:text-[#e8d0c0]'}`}
              title="연속 플롯 뷰"
            >연속</button>
          </div>
          <button
            onClick={() => setShowNewPlot(true)}
            className="text-sm text-[#E88D14] hover:text-[#F3BE26]"
          >+ 추가</button>
        </div>
      </div>

      {/* New plot input */}
      {showNewPlot && (
        <div className="px-4 py-2 flex gap-2 border-b border-[#2a1208]">
          <input
            autoFocus
            value={newPlotTitle}
            onChange={(e) => setNewPlotTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowNewPlot(false); setNewPlotTitle(''); }
            }}
            placeholder="플롯 제목 입력..."
            className="flex-1 bg-[#1e0e08] text-[#f0ddd0] rounded px-3 py-1.5 text-sm outline-none border border-[#3a1a0a]"
          />
          <button onClick={handleCreate} className="text-[#E88D14] hover:text-[#F3BE26] text-sm">추가</button>
          <button onClick={() => setShowNewPlot(false)} className="text-[#8a6050] text-sm">취소</button>
        </div>
      )}

      {/* Plot list */}
      <div className="flex-1 overflow-y-auto p-4">
        {episodePlots.length === 0 ? (
          <div className="text-center text-[#8a5535] text-sm mt-8">
            <div className="text-3xl mb-2">📝</div>
            <p>플롯이 없습니다</p>
            <button
              onClick={() => setShowNewPlot(true)}
              className="mt-2 text-[#E88D14] hover:text-[#F3BE26] text-xs"
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
                  isSelected={viewMode === 'single' && selectedPlotIds.includes(plot.id)}
                  onClick={(e) => {
                    if (viewMode === 'continuous' && onScrollTo) {
                      onScrollTo(plot.id);
                    } else {
                      selectPlot(plot.id, e.metaKey || e.ctrlKey);
                    }
                  }}
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
