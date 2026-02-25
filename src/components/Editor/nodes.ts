import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SceneHeadingView from './SceneHeadingView';

// Scene Heading: S#n 씬 번호 자동 부여
export const SceneHeading = Node.create({
  name: 'sceneHeading',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      sceneNumber: { default: 1 },
      location: { default: '', parseHTML: (el) => el.getAttribute('data-location') || '', renderHTML: (attrs) => ({ 'data-location': attrs.location }) },
      time: { default: '', parseHTML: (el) => el.getAttribute('data-time') || '', renderHTML: (attrs) => ({ 'data-time': attrs.time }) },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="scene-heading"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'scene-heading', class: 'scene-heading' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneHeadingView);
  },
});

// Dialogue: 캐릭터 이름 + 왼쪽 border + 색상
export const Dialogue = Node.create({
  name: 'dialogue',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      characterName: { default: '' },
      characterColor: { default: '#6366f1' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="dialogue"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { characterName, characterColor, ...rest } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(rest, {
        'data-type': 'dialogue',
        class: 'dialogue-node',
        style: `border-color: ${characterColor}`,
      }),
      [
        'div',
        { class: 'dialogue-character', style: `color: ${characterColor}` },
        characterName || '인물',
      ],
      ['div', { class: 'dialogue-text' }, 0],
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor.view;
        const { selection } = state;
        const node = selection.$from.node();

        if (node.type.name !== 'dialogue') return false;

        if (node.textContent === '') {
          return this.editor.chain().focus().setParagraph().run();
        }

        const { characterName, characterColor } = node.attrs;
        return this.editor.chain()
          .focus()
          .insertContentAt(selection.to, {
            type: 'dialogue',
            attrs: { characterName, characterColor },
          })
          .run();
      },
    };
  },
});

// Narration: 중앙 정렬, 회색
export const Narration = Node.create({
  name: 'narration',
  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="narration"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'narration', class: 'narration-node' }), 0];
  },
});

// Stage Direction: 지문
export const StageDirection = Node.create({
  name: 'stageDirection',
  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="stage-direction"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'stage-direction', class: 'stage-direction-node' }), 0];
  },
});
