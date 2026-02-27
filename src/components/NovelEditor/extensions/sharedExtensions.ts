import { Extension } from '@tiptap/core';

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

export const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontFamily || null,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily }).run(),
      unsetFontFamily: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

export const TabIndent = Extension.create({
  name: 'tabIndent',
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) return false;
        const { state } = editor;
        const { $from } = state.selection;
        const node = $from.node($from.depth);
        if (node.type.name === 'paragraph' || node.type.name === 'heading') {
          const currentIndent = node.attrs.textIndent || 0;
          editor.chain().focus().updateAttributes(node.type.name, { textIndent: currentIndent ? 0 : 1 }).run();
          return true;
        }
        return false;
      },
    };
  },
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        textIndent: {
          default: 0,
          parseHTML: (el: HTMLElement) => el.style.textIndent ? 1 : 0,
          renderHTML: (attrs: Record<string, any>) =>
            attrs.textIndent ? { style: 'text-indent: 2em' } : {},
        },
      },
    }];
  },
});

export const FONT_FAMILY_OPTIONS = [
  { label: '기본', value: '' },
  { label: 'Noto Sans KR', value: "'Noto Sans KR', sans-serif" },
  { label: '나눔고딕', value: "'Nanum Gothic', sans-serif" },
  { label: '나눔명조', value: "'Nanum Myeongjo', serif" },
  { label: 'Noto Serif KR', value: "'Noto Serif KR', serif" },
  { label: 'Gowun Dodum', value: "'Gowun Dodum', sans-serif" },
];

export const DOCX_FONT_MAP: Record<string, string> = {
  "'Noto Sans KR', sans-serif": 'Noto Sans KR',
  "'Nanum Gothic', sans-serif": '나눔고딕',
  "'Nanum Myeongjo', serif": '나눔명조',
  "'Noto Serif KR', serif": 'Noto Serif KR',
  "'Gowun Dodum', sans-serif": 'Gowun Dodum',
};
