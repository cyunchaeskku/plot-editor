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
  const { selectedWorkId, characters } = useStore();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const workChars = selectedWorkId ? (characters[selectedWorkId] || []) : [];

  const baseItems: MenuItem[] = [
    {
      label: '씬 헤딩',
      description: 'S#n 씬 번호',
      icon: '🎬',
      action: () => {
        editor.chain().focus().deleteRange({
          from: editor.state.selection.from - 1,
          to: editor.state.selection.from,
        }).setNode('sceneHeading').run();
        onClose();
      },
    },
    {
      label: '나레이션',
      description: '중앙 정렬 나레이션',
      icon: '📢',
      action: () => {
        editor.chain().focus().deleteRange({
          from: editor.state.selection.from - 1,
          to: editor.state.selection.from,
        }).setNode('narration').run();
        onClose();
      },
    },
    {
      label: '지문',
      description: '무대 지시문',
      icon: '📋',
      action: () => {
        editor.chain().focus().deleteRange({
          from: editor.state.selection.from - 1,
          to: editor.state.selection.from,
        }).setNode('stageDirection').run();
        onClose();
      },
    },
    {
      label: '일반 텍스트',
      description: '기본 단락',
      icon: '¶',
      action: () => {
        editor.chain().focus().deleteRange({
          from: editor.state.selection.from - 1,
          to: editor.state.selection.from,
        }).setParagraph().run();
        onClose();
      },
    },
  ];

  // Add character dialogue items
  const charItems: MenuItem[] = workChars.map((char) => ({
    label: `대사: ${char.name}`,
    description: `${char.name}의 대사`,
    icon: '💬',
    action: () => {
      editor.chain().focus().deleteRange({
        from: editor.state.selection.from - 1,
        to: editor.state.selection.from,
      }).setNode('dialogue', {
        characterName: char.name,
        characterColor: char.color,
      }).run();
      onClose();
    },
  }));

  const items = [...baseItems, ...charItems];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[activeIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [activeIndex, items, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      className="slash-menu fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          ref={(el) => { itemRefs.current[idx] = el; }}
          className={`slash-menu-item ${idx === activeIndex ? 'active' : ''}`}
          onClick={item.action}
          onMouseEnter={() => setActiveIndex(idx)}
        >
          <span className="text-base">{item.icon}</span>
          <div>
            <div className="text-sm text-gray-900">{item.label}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
