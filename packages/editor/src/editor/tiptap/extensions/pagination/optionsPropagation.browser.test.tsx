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

/*
 * The pagination plugin reads options through the extension context it was
 * created with. These tests pin down that `updatePaginationSettings` reaches
 * that context, which is what lets settings apply without rebuilding the
 * editor.
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

const getPluginVisibleOptions = (editor: TiptapEditor) => {
    const extension = editor.extensionManager.extensions.find(
        candidate => candidate.name === 'Pagination',
    );

    if (!extension) {
        throw new Error('Pagination extension not registered');
    }

    return extension.options as {pageHeight: number, pageWidth: number};
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

    it('exposes updated settings on the shared extension options', () => {
        const editor = createEditor();

        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {pageHeight: number}) => boolean,
        };

        commands.updatePaginationSettings?.({pageHeight: 2000});

        expect(getPluginVisibleOptions(editor).pageHeight).toBe(2000);
    });

    it('bumps the options version so the plugin recalculates', () => {
        const editor = createEditor();
        const storage = editor.storage.Pagination as {optionsVersion: number};
        const before = storage.optionsVersion;

        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {pageHeight: number}) => boolean,
        };

        commands.updatePaginationSettings?.({pageHeight: 2000});

        expect(storage.optionsVersion).toBe(before + 1);
    });
});
