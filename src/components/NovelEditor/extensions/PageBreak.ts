import { Node, mergeAttributes } from '@tiptap/core';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-break',
        class: 'page-break',
        contenteditable: 'false',
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () =>
        this.editor.chain().focus().insertContent({ type: this.name }).run(),
    };
  },
});
