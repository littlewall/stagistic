import {Editor as TiptapEditor} from '@tiptap/core';
import Text from '@tiptap/extension-text';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {ScriptBlockNodes} from '../../nodes';
import {DocumentWithSettings} from '../DocumentExtension';
import {PaginationExtension} from '../PaginationExtension';
import {paginationKey} from './plugin/createPaginationPlugin';
import type {PaginationStorage} from './types';

/*
 * Tiptap creates separate contexts for commands and plugins. These tests pin
 * down that both sides share pagination options through extension storage,
 * which lets settings apply without rebuilding the editor.
 */

const editors: TiptapEditor[] = [];

const createEditor = () => {
    const host = document.createElement('div');

    host.style.width = '794px';
    document.body.appendChild(host);

    const editor = new TiptapEditor({
        element: host,
        extensions: [
            DocumentWithSettings,
            Text,
            ...ScriptBlockNodes,
            PaginationExtension.configure({pageHeight: 1123, pageWidth: 794}),
        ],
        content: {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-1'},
                    content: [{type: 'text', text: 'Hello'}],
                },
            ],
        },
    });

    editors.push(editor);

    return editor;
};

const getPaginationStorage = (editor: TiptapEditor) => {
    const storage = editor.storage as unknown as Record<string, unknown>;

    return storage.Pagination as PaginationStorage;
};

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for pagination state');
};

describe('pagination options propagation', () => {
    afterEach(() => {
        editors.splice(0).forEach(editor => {
            if (!editor.isDestroyed) {
                editor.destroy();
            }
        });
        document.body.innerHTML = '';
    });

    it('exposes updated settings on shared pagination storage', () => {
        const editor = createEditor();

        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {pageHeight: number}) => boolean,
        };

        commands.updatePaginationSettings?.({pageHeight: 2000});

        expect(getPaginationStorage(editor).options.pageHeight).toBe(2000);
    });

    it('bumps the options version so the plugin recalculates', () => {
        const editor = createEditor();
        const storage = getPaginationStorage(editor);
        const before = storage.optionsVersion;

        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {pageHeight: number}) => boolean,
        };

        commands.updatePaginationSettings?.({pageHeight: 2000});

        expect(storage.optionsVersion).toBe(before + 1);
    });

    it('recalculates pagination from updated storage options', async () => {
        const editor = createEditor();
        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {pageHeight: number}) => boolean,
        };

        commands.updatePaginationSettings?.({pageHeight: 2000});

        await waitFor(
            () => paginationKey.getState(editor.state)?.pagination.pageHeight === 2000,
        );

        expect(paginationKey.getState(editor.state)?.pagination.pageHeight).toBe(2000);
    });
});
