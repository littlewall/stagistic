import {Extension} from '@tiptap/core';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import {Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';

import {findSearchResults} from './findSearchResults';
import type {EditorSearchSnapshot, SearchCriteria, SearchResult} from './types';
import {DEFAULT_SEARCH_CRITERIA} from './types';

import styles from './SearchExtension.module.css';

type SearchMeta = {type: 'criteria'; criteria: SearchCriteria} | {type: 'clear'} | {type: 'next'} | {type: 'previous'};

const editorSearchPluginKey = new PluginKey<EditorSearchSnapshot>('editor-search');

const emptySnapshot: EditorSearchSnapshot = {
    criteria: DEFAULT_SEARCH_CRITERIA,
    results: [],
    currentIndex: -1,
    decorations: DecorationSet.empty,
};

const findInitialIndex = (results: readonly SearchResult[], origin: number) => {
    const index = results.findIndex(result => result.from >= origin);

    return results.length === 0 ? -1 : index === -1 ? 0 : index;
};

const moveIndex = (current: number, count: number, delta: -1 | 1) => {
    if (count === 0) {
        return -1;
    }

    return (current + delta + count) % count;
};

const buildDecorations = (document: ProseMirrorNode, results: readonly SearchResult[], currentIndex: number) =>
    DecorationSet.create(
        document,
        results.map((result, index) =>
            Decoration.inline(result.from, result.to, {
                class: index === currentIndex ? `${styles.match} ${styles.current}` : styles.match,
                'data-editor-search-match': 'true',
                ...(index === currentIndex ? {'data-editor-search-current': 'true'} : {}),
            }),
        ),
    );

const buildSnapshot = (document: ProseMirrorNode, criteria: SearchCriteria, results: readonly SearchResult[], currentIndex: number): EditorSearchSnapshot => ({
    criteria,
    results,
    currentIndex,
    decorations: buildDecorations(document, results, currentIndex),
});

const buildCriteriaSnapshot = (document: ProseMirrorNode, criteria: SearchCriteria, origin: number) => {
    const results = findSearchResults(document, criteria);

    return buildSnapshot(document, criteria, results, findInitialIndex(results, origin));
};

const buildUpdatedDocumentSnapshot = (document: ProseMirrorNode, previous: EditorSearchSnapshot, mappedActiveFrom: number | null, origin: number) => {
    const results = findSearchResults(document, previous.criteria);

    if (mappedActiveFrom === null) {
        return buildSnapshot(document, previous.criteria, results, findInitialIndex(results, origin));
    }

    const exactIndex = results.findIndex(result => result.from === mappedActiveFrom);
    const currentIndex = exactIndex === -1 ? findInitialIndex(results, mappedActiveFrom) : exactIndex;

    return buildSnapshot(document, previous.criteria, results, currentIndex);
};

export const getEditorSearchSnapshot = (state: Parameters<PluginKey<EditorSearchSnapshot>['getState']>[0]) => {
    return editorSearchPluginKey.getState(state) ?? emptySnapshot;
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        editorSearch: {
            setSearchCriteria: (criteria: SearchCriteria) => ReturnType;
            clearSearch: () => ReturnType;
            goToNextSearchResult: () => ReturnType;
            goToPreviousSearchResult: () => ReturnType;
        };
    }
}

export const SearchExtension = Extension.create({
    name: 'editorSearch',

    addCommands() {
        return {
            setSearchCriteria:
                criteria =>
                ({tr, dispatch}) => {
                    if (dispatch) {
                        tr.setMeta(editorSearchPluginKey, {type: 'criteria', criteria} satisfies SearchMeta).setMeta('addToHistory', false);
                    }

                    return true;
                },
            clearSearch:
                () =>
                ({tr, dispatch}) => {
                    if (dispatch) {
                        tr.setMeta(editorSearchPluginKey, {type: 'clear'} satisfies SearchMeta).setMeta('addToHistory', false);
                    }

                    return true;
                },
            goToNextSearchResult:
                () =>
                ({tr, dispatch}) => {
                    if (dispatch) {
                        tr.setMeta(editorSearchPluginKey, {type: 'next'} satisfies SearchMeta).setMeta('addToHistory', false);
                    }

                    return true;
                },
            goToPreviousSearchResult:
                () =>
                ({tr, dispatch}) => {
                    if (dispatch) {
                        tr.setMeta(editorSearchPluginKey, {type: 'previous'} satisfies SearchMeta).setMeta('addToHistory', false);
                    }

                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<EditorSearchSnapshot>({
                key: editorSearchPluginKey,
                state: {
                    init: (_config, state) => buildSnapshot(state.doc, DEFAULT_SEARCH_CRITERIA, [], -1),
                    apply: (tr, previous) => {
                        const meta = tr.getMeta(editorSearchPluginKey) as SearchMeta | undefined;

                        if (meta?.type === 'criteria') {
                            return buildCriteriaSnapshot(tr.doc, meta.criteria, tr.selection.anchor);
                        }

                        if (meta?.type === 'clear') {
                            return buildSnapshot(tr.doc, DEFAULT_SEARCH_CRITERIA, [], -1);
                        }

                        if (meta?.type === 'next') {
                            return buildSnapshot(tr.doc, previous.criteria, previous.results, moveIndex(previous.currentIndex, previous.results.length, 1));
                        }

                        if (meta?.type === 'previous') {
                            return buildSnapshot(tr.doc, previous.criteria, previous.results, moveIndex(previous.currentIndex, previous.results.length, -1));
                        }

                        if (!tr.docChanged || !previous.criteria.query) {
                            return previous;
                        }

                        const active = previous.results[previous.currentIndex];

                        return buildUpdatedDocumentSnapshot(tr.doc, previous, active ? tr.mapping.map(active.from, 1) : null, tr.selection.anchor);
                    },
                },
                props: {
                    decorations: state => editorSearchPluginKey.getState(state)?.decorations,
                },
            }),
        ];
    },
});
