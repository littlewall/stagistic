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

const rgbChannels = (color: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context is unavailable');
    }

    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);

    return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
};

const relativeLuminance = (color: string) => {
    const channels = rgbChannels(color).map(channel => {
        const value = channel / 255;

        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const colorfulness = (color: string) => {
    const channels = rgbChannels(color);

    return Math.max(...channels) - Math.min(...channels);
};

const contrastRatio = (foreground: string, background: string) => {
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);

    return (lighter + 0.05) / (darker + 0.05);
};

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
    delete document.documentElement.dataset.theme;
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

    it('keeps both dark-mode search highlight levels readable and visibly yellow', () => {
        document.documentElement.dataset.theme = 'dark';
        const editor = createSearchEditor('light one light two');

        editor.commands.setSearchCriteria(criteria('light'));

        const current = editor.view.dom.querySelector<HTMLElement>('[data-editor-search-current="true"]');
        const passive = [...editor.view.dom.querySelectorAll<HTMLElement>('[data-editor-search-match="true"]')].find(match => match !== current);

        if (!current || !passive) {
            throw new Error('Expected current and passive search highlights');
        }

        const currentStyle = getComputedStyle(current);
        const passiveStyle = getComputedStyle(passive);

        expect(contrastRatio(currentStyle.color, currentStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(passiveStyle.color, passiveStyle.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        expect(colorfulness(currentStyle.backgroundColor)).toBeGreaterThanOrEqual(40);
        expect(colorfulness(passiveStyle.backgroundColor)).toBeGreaterThanOrEqual(40);
        expect(currentStyle.backgroundColor).not.toBe(passiveStyle.backgroundColor);
    });
});
