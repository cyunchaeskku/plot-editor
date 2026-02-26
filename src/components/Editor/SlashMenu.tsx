import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useStore } from '../../store';

interface SlashMenuProps {
  editor: Editor;
  position: { top: number; left: number };
  onClose: () => void;
}

interface MenuItem {
  label: string;
  description: string;
  icon: string;
  action: () => void;
}

export default function SlashMenu({ editor, position, onClose }: SlashMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCharPicker, setShowCharPicker] = useState(false);
  const { selectedWorkId, characters } = useStore();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const workChars = selectedWorkId ? (characters[selectedWorkId] || []) : [];

  const deleteSlash = () => {
    editor.chain().focus().deleteRange({
      from: editor.state.selection.from - 1,
      to: editor.state.selection.from,
    }).run();
  };

  const baseItems: MenuItem[] = [
    {
      label: '씬 헤딩',
      description: 'S#n 씬 번호',
      icon: '🎬',
      action: () => {
        deleteSlash();
        editor.chain().focus().setNode('sceneHeading').run();
        onClose();
      },
    },
    {
      label: '나레이션',
      description: '중앙 정렬 나레이션',
      icon: '📢',
      action: () => {
        deleteSlash();
        editor.chain().focus().setNode('narration').run();
        onClose();
      },
    },
    {
      label: '지문',
      description: '무대 지시문',
      icon: '📋',
      action: () => {
        deleteSlash();
        editor.chain().focus().setNode('stageDirection').run();
        onClose();
      },
    },
    {
      label: '단락',
      description: '기본 단락',
      icon: '¶',
      action: () => {
        deleteSlash();
        editor.chain().focus().setParagraph().run();
        onClose();
      },
    },
    {
      label: '대사',
      description: workChars.length > 0 ? '인물 선택' : '빈 대사 삽입',
      icon: '💬',
      action: () => {
        if (workChars.length === 0) {
          deleteSlash();
          editor.chain().focus().setNode('dialogue', { characterName: '', characterColor: '#6366f1' }).run();
          onClose();
        } else {
          setShowCharPicker(true);
          setActiveIndex(0);
        }
      },
    },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (showCharPicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i + 1) % workChars.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i - 1 + workChars.length) % workChars.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const char = workChars[activeIndex];
        if (char) {
          deleteSlash();
          editor.chain().focus().setNode('dialogue', { characterName: char.name, characterColor: char.color }).run();
          onClose();
        }
      } else if (e.key === 'Escape') {
        setShowCharPicker(false);
        setActiveIndex(4); // back to '대사' item
      }
    } else {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i + 1) % baseItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) => (i - 1 + baseItems.length) % baseItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        baseItems[activeIndex]?.action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    }
  }, [activeIndex, showCharPicker, workChars, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (showCharPicker) {
    return (
      <div
        className="slash-menu fixed z-50"
        style={{ top: position.top, left: position.left }}
      >
        <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-200 flex items-center gap-2">
          <button
            className="hover:text-gray-700 text-gray-400"
            onMouseDown={(e) => { e.preventDefault(); setShowCharPicker(false); setActiveIndex(4); }}
          >◀</button>
          대사 — 인물 선택
        </div>
        {workChars.map((char, idx) => (
          <div
            key={char.id}
            ref={(el) => { itemRefs.current[idx] = el; }}
            className={`slash-menu-item ${idx === activeIndex ? 'active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              deleteSlash();
              editor.chain().focus().setNode('dialogue', { characterName: char.name, characterColor: char.color }).run();
              onClose();
            }}
            onMouseEnter={() => setActiveIndex(idx)}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: char.color }}
            />
            <div>
              <div className="text-sm text-gray-900">{char.name}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="slash-menu fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      {baseItems.map((item, idx) => (
        <div
          key={idx}
          ref={(el) => { itemRefs.current[idx] = el; }}
          className={`slash-menu-item ${idx === activeIndex ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); item.action(); }}
          onMouseEnter={() => setActiveIndex(idx)}
        >
          <span className="text-base">{item.icon}</span>
          <div>
            <div className="text-sm text-gray-900">{item.label}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
          {item.label === '대사' && workChars.length > 0 && (
            <span className="ml-auto text-gray-400 text-xs">▶</span>
          )}
        </div>
      ))}
    </div>
  );
}
