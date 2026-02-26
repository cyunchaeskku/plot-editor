import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const findReplaceKey = new PluginKey<FindReplacePluginState>('findReplace');

interface FindReplacePluginState {
  searchTerm: string;
  decorations: DecorationSet;
}

interface MatchRange {
  from: number;
  to: number;
}

export function findAllMatches(doc: any, searchTerm: string): MatchRange[] {
  const matches: MatchRange[] = [];
  if (!searchTerm) return matches;
  const lower = searchTerm.toLowerCase();

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = (node.text as string).toLowerCase();
    let index = 0;
    while (index < text.length) {
      const found = text.indexOf(lower, index);
      if (found === -1) break;
      matches.push({ from: pos + found, to: pos + found + searchTerm.length });
      index = found + 1;
    }
  });

  return matches;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      setSearchTerm: (term: string) => ReturnType;
      findNext: () => ReturnType;
      findPrev: () => ReturnType;
      replaceOne: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

export const FindReplace = Extension.create({
  name: 'findReplace',

  addStorage() {
    return {
      searchTerm: '',
      matchCount: 0,
    };
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ state, dispatch, tr }: any) => {
          this.storage.searchTerm = term;
          const matches = findAllMatches(state.doc, term);
          this.storage.matchCount = matches.length;
          if (dispatch) {
            dispatch(tr.setMeta(findReplaceKey, { searchTerm: term }));
          }
          return true;
        },

      findNext:
        () =>
        ({ editor, state, dispatch }: any) => {
          const { searchTerm } = this.storage;
          if (!searchTerm) return false;
          const matches = findAllMatches(state.doc, searchTerm);
          if (!matches.length) return false;

          const { from } = state.selection;
          const nextMatch = matches.find((m: MatchRange) => m.from > from) ?? matches[0];

          if (dispatch) {
            const transaction = state.tr.setSelection(
              TextSelection.create(state.doc, nextMatch.from, nextMatch.to),
            );
            dispatch(transaction);
          }
          editor.commands.scrollIntoView();
          return true;
        },

      findPrev:
        () =>
        ({ editor, state, dispatch }: any) => {
          const { searchTerm } = this.storage;
          if (!searchTerm) return false;
          const matches = findAllMatches(state.doc, searchTerm);
          if (!matches.length) return false;

          const { from } = state.selection;
          const prevMatches = matches.filter((m: MatchRange) => m.to < from);
          const prevMatch =
            prevMatches[prevMatches.length - 1] ?? matches[matches.length - 1];

          if (dispatch) {
            const transaction = state.tr.setSelection(
              TextSelection.create(state.doc, prevMatch.from, prevMatch.to),
            );
            dispatch(transaction);
          }
          editor.commands.scrollIntoView();
          return true;
        },

      replaceOne:
        (replacement: string) =>
        ({ editor, state, dispatch }: any) => {
          const { searchTerm } = this.storage;
          if (!searchTerm) return false;
          const matches = findAllMatches(state.doc, searchTerm);
          if (!matches.length) return false;

          const { from } = state.selection;
          const match =
            matches.find((m: MatchRange) => m.from >= from - 1) ?? matches[0];

          if (dispatch) {
            dispatch(state.tr.insertText(replacement, match.from, match.to));
          }
          setTimeout(() => editor.commands.findNext(), 0);
          return true;
        },

      replaceAll:
        (replacement: string) =>
        ({ state, dispatch }: any) => {
          const matches = findAllMatches(state.doc, this.storage.searchTerm);
          if (!matches.length) return false;
          if (dispatch) {
            let transaction = state.tr;
            for (let i = matches.length - 1; i >= 0; i--) {
              transaction = transaction.insertText(
                replacement,
                matches[i].from,
                matches[i].to,
              );
            }
            dispatch(transaction);
          }
          return true;
        },
    } as any;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindReplacePluginState>({
        key: findReplaceKey,

        state: {
          init(_config, _state) {
            return { searchTerm: '', decorations: DecorationSet.empty };
          },
          apply(tr, pluginState, _oldState, newState) {
            const meta = tr.getMeta(findReplaceKey) as
              | { searchTerm: string }
              | undefined;
            const searchTerm =
              meta !== undefined ? meta.searchTerm : pluginState.searchTerm;

            if (!searchTerm) {
              return { searchTerm: '', decorations: DecorationSet.empty };
            }

            const matches = findAllMatches(newState.doc, searchTerm);
            const decorations = DecorationSet.create(
              newState.doc,
              matches.map(({ from, to }) =>
                Decoration.inline(from, to, { class: 'find-highlight' }),
              ),
            );
            return { searchTerm, decorations };
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
