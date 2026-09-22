import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {Editor} from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Text from '@tiptap/extension-text';
import {afterEach, describe, expect, it} from 'vite-plus/test';

import {ScriptBlockNodes} from '../../nodes';
import {DocumentWithSettings} from '../DocumentExtension';
import {getEditorSearchSnapshot, SearchExtension} from './SearchExtension';
import type {SearchCriteria, SearchResult} from './types';

const editors: Editor[] = [];

const criteria = (query: string): SearchCriteria => ({
    query,
    caseSensitive: false,
    blockTypes: null,
});

const createSearchEditor = (value: string) => {
    const element = document.createElement('div');

    document.body.appendChild(element);

    const editor = new Editor({
        element,
        content: {
            type: 'doc',
            content: [
                {
                    type: 'dialogue',
                    attrs: {id: 'dialogue-1'},
                    content: [{type: 'text', text: value}],
                },
            ],
        } satisfies ScriptDocument,
        extensions: [DocumentWithSettings, Text, Bold, ...ScriptBlockNodes, SearchExtension],
    });

    editors.push(editor);

    return editor;
};

const activeResult = (editor: Editor): SearchResult => {
    const snapshot = getEditorSearchSnapshot(editor.state);
    const result = snapshot.results[snapshot.currentIndex];

    if (!result) {
        throw new Error('Expected an active search result');
    }

    return result;
};

afterEach(() => {
    editors.forEach(editor => editor.destroy());
    editors.length = 0;
    document.body.innerHTML = '';
});

describe('SearchExtension', () => {
    it('chooses the first result at or after the current selection and wraps', () => {
        const editor = createSearchEditor('light one light two');

        editor.commands.setTextSelection(8);
        editor.commands.setSearchCriteria(criteria('light'));

        const snapshot = getEditorSearchSnapshot(editor.state);

        expect(snapshot.results).toHaveLength(2);
        expect(snapshot.currentIndex).toBe(1);
    });

    it('navigates cyclically without changing the editor selection', () => {
        const editor = createSearchEditor('light one light two');

        editor.commands.setTextSelection(1);
        const selectionBefore = editor.state.selection.from;
        editor.commands.setSearchCriteria(criteria('light'));
        editor.commands.goToPreviousSearchResult();

        expect(getEditorSearchSnapshot(editor.state).currentIndex).toBe(1);
        expect(editor.state.selection.from).toBe(selectionBefore);

        editor.commands.goToNextSearchResult();

        expect(getEditorSearchSnapshot(editor.state).currentIndex).toBe(0);
        expect(editor.state.selection.from).toBe(selectionBefore);
    });

    it('preserves the mapped active occurrence after editing', () => {
        const editor = createSearchEditor('light one light two');

        editor.commands.setSearchCriteria(criteria('light'));
        editor.commands.goToNextSearchResult();
        const activeBefore = activeResult(editor).from;

        editor.commands.insertContentAt(1, 'new ');

        expect(activeResult(editor).from).toBe(activeBefore + 4);
    });

    it('selects the closest following occurrence when the active one is deleted', () => {
        const editor = createSearchEditor('light one light two light');

        editor.commands.setSearchCriteria(criteria('light'));
        editor.commands.goToNextSearchResult();
        const removed = activeResult(editor);
        const transaction = editor.state.tr.delete(removed.from, removed.to);
        const expectedSelection = transaction.selection.from;

        editor.view.dispatch(transaction);

        expect(activeResult(editor).from).toBeGreaterThanOrEqual(removed.from);
        expect(editor.state.selection.from).toBe(expectedSelection);
    });

    it('clears results and decorations', () => {
        const editor = createSearchEditor('light');

        editor.commands.setSearchCriteria(criteria('light'));
        editor.commands.clearSearch();

        const snapshot = getEditorSearchSnapshot(editor.state);

        expect(snapshot.criteria.query).toBe('');
        expect(snapshot.results).toEqual([]);
        expect(snapshot.currentIndex).toBe(-1);
        expect(snapshot.decorations.find()).toEqual([]);
    });

    it('activates a result created after a zero-result search', () => {
        const editor = createSearchEditor('night');

        editor.commands.setSearchCriteria(criteria('light'));
        expect(getEditorSearchSnapshot(editor.state).results).toEqual([]);

        editor.commands.insertContentAt(1, 'light ');

        const snapshot = getEditorSearchSnapshot(editor.state);

        expect(snapshot.results).toHaveLength(1);
        expect(snapshot.currentIndex).toBe(0);
    });
});
