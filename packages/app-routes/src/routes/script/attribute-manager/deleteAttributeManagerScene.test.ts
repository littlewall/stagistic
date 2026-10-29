import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {deleteAttributeManagerScene} from './deleteAttributeManagerScene';

const document: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'h1'},
            content: [{type: 'text', text: 'Scene'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'a1'},
            content: [{type: 'text', text: 'Waits.'}],
        },
    ],
};

describe('deleteAttributeManagerScene', () => {
    it('removes only the heading through the shared document mutation', async () => {
        const applyDocumentChange = vi.fn(() => Promise.resolve(true));

        await deleteAttributeManagerScene({
            document,
            sceneHeadingBlockId: 'h1',
            applyDocumentChange,
        });
        expect(applyDocumentChange).toHaveBeenCalledWith({changed: true, value: {type: 'doc', content: [document.content[1]]}});
        expect(document.content).toHaveLength(2);
    });
    it('does nothing without a document or a matching heading', async () => {
        const applyDocumentChange = vi.fn(() => Promise.resolve(true));

        await deleteAttributeManagerScene({
            document: null,
            sceneHeadingBlockId: 'h1',
            applyDocumentChange,
        });
        await deleteAttributeManagerScene({
            document,
            sceneHeadingBlockId: 'missing',
            applyDocumentChange,
        });
        expect(applyDocumentChange).not.toHaveBeenCalled();
    });
    it('surfaces a failed document save', async () => {
        await expect(deleteAttributeManagerScene({
            document,
            sceneHeadingBlockId: 'h1',
            applyDocumentChange: () => Promise.resolve(false),
        })).rejects.toThrow('could not be removed');
    });
});
