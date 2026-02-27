import React, { useState, useEffect } from 'react';
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
import type { Episode } from '../../db';

function ChapterItem({ episode, index, isActive, onClick, onDelete, onRename }: {
  episode: Episode;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: episode.id });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(episode.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const commitEdit = () => {
    const val = editValue.trim();
    if (val && val !== episode.title) onRename(val);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group rounded-md mb-0.5
        ${isActive
          ? 'bg-[#3d0c04] text-[#f0ddd0] border-l-2 border-[#AD1B02]'
          : 'text-gray-300 hover:bg-gray-800 border-l-2 border-transparent'
        }
      `}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing text-xs select-none"
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </span>

      <span className="text-xs text-gray-500 font-mono w-6 flex-shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>

      {editing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 bg-gray-700 text-gray-200 rounded px-1 py-0.5 text-sm outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-sm truncate"
          onDoubleClick={(e) => { e.stopPropagation(); setEditValue(episode.title); setEditing(true); }}
        >
          {episode.title}
        </span>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); if (confirm(`"${episode.title}" 챕터를 삭제하시겠습니까?`)) onDelete(); }}
        className="text-gray-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 flex-shrink-0"
      >✕</button>
    </div>
  );
}

interface ChapterListProps {
  activeChapterEpisodeId: number | null;
  onSelectChapter: (episodeId: number) => void;
  viewMode: 'single' | 'continuous';
  onViewModeChange: (mode: 'single' | 'continuous') => void;
}

export default function ChapterList({ activeChapterEpisodeId, onSelectChapter, viewMode, onViewModeChange }: ChapterListProps) {
  const {
    selectedWorkId,
    works,
    episodes,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    reorderEpisodes,
  } = useStore();

  const [newTitle, setNewTitle] = useState('');
  const [showNew, setShowNew] = useState(false);

  const currentWork = works.find((w) => w.id === selectedWorkId);
  const chapterList = selectedWorkId ? (episodes[selectedWorkId] || []) : [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedWorkId) return;
    const oldIndex = chapterList.findIndex((ep) => ep.id === active.id);
    const newIndex = chapterList.findIndex((ep) => ep.id === over.id);
    const reordered = arrayMove(chapterList, oldIndex, newIndex).map((ep, i) => ({
      ...ep,
      order_index: i,
    }));
    reorderEpisodes(selectedWorkId, reordered);
  };

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!selectedWorkId || !title) return;
    setNewTitle('');
    setShowNew(false);
    await createEpisode(selectedWorkId, title);
  };

  if (!selectedWorkId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3">📖</div>
          <p>작품을 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="text-sm font-semibold text-gray-300 truncate">
          {currentWork ? `${currentWork.title} / 챕터` : '챕터'}
        </span>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded overflow-hidden border border-gray-700">
            <button
              onClick={() => onViewModeChange('single')}
              className={`px-2 py-0.5 text-xs transition-colors ${viewMode === 'single' ? 'bg-[#AD1B02] text-[#f0ddd0]' : 'text-gray-500 hover:text-gray-300'}`}
              title="단일 챕터 뷰"
            >단일</button>
            <button
              onClick={() => onViewModeChange('continuous')}
              className={`px-2 py-0.5 text-xs transition-colors ${viewMode === 'continuous' ? 'bg-[#AD1B02] text-[#f0ddd0]' : 'text-gray-500 hover:text-gray-300'}`}
              title="연속 챕터 뷰"
            >연속</button>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="text-sm text-[#E88D14] hover:text-[#F3BE26]"
          >+ 추가</button>
        </div>
      </div>

      {/* New chapter input */}
      {showNew && (
        <div className="px-4 py-2 flex gap-2 border-b border-gray-800">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowNew(false); setNewTitle(''); }
            }}
            placeholder="챕터 제목 입력..."
            className="flex-1 bg-gray-800 text-gray-200 rounded px-3 py-1.5 text-sm outline-none border border-gray-600"
          />
          <button onClick={handleCreate} className="text-[#E88D14] hover:text-[#F3BE26] text-sm">추가</button>
          <button onClick={() => setShowNew(false)} className="text-gray-500 text-sm">취소</button>
        </div>
      )}

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto p-3">
        {chapterList.length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-8">
            <div className="text-3xl mb-2">📝</div>
            <p>챕터가 없습니다</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-2 text-[#E88D14] hover:text-[#F3BE26] text-xs"
            >+ 첫 번째 챕터 추가</button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={chapterList.map((ep) => ep.id)} strategy={verticalListSortingStrategy}>
              {chapterList.map((ep, index) => (
                <ChapterItem
                  key={ep.id}
                  episode={ep}
                  index={index}
                  isActive={viewMode === 'single' && activeChapterEpisodeId === ep.id}
                  onClick={() => onSelectChapter(ep.id)}
                  onDelete={() => deleteEpisode(ep.id)}
                  onRename={(title) => updateEpisode(ep.id, title)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
