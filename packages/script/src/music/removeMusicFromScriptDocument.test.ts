import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptDocument} from '../document';

describe('removeMusicFromScriptDocument', () => {
    it('removes the selected start and paired out while preserving other music', async () => {
        const scriptApi = await import('../index') as typeof import('../index') & {
            removeMusicFromScriptDocument?: (
                document: ScriptDocument,
                musicId: string,
            ) => {value: ScriptDocument, changed: boolean},
        };
        const removeMusic = scriptApi.removeMusicFromScriptDocument;
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-1'},
                    content: [
                        {type: 'text', text: 'First'}, {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'music-1',
                                mode: 'open',
                                title: 'Opening',
                                kind: 'song',
                            },
                        },
                    ],
                },
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-2'},
                    content: [{type: 'text', text: 'Middle'}, {type: 'musicOut'}],
                },
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-3'},
                    content: [
                        {type: 'text', text: 'Second'}, {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'music-2',
                                mode: 'hit',
                                title: 'Sting',
                                kind: 'instrumental',
                            },
                        },
                    ],
                },
            ],
        };

        expect(removeMusic).toBeTypeOf('function');

        if (!removeMusic) {
            return;
        }

        const result = removeMusic(document, 'music-1');

        expect(result.changed).toBe(true);
        expect(result.value.content).toEqual([
            {
                type: 'stageDirection',
                attrs: {id: 'block-1'},
                content: [{type: 'text', text: 'First'}],
            },
            {
                type: 'stageDirection',
                attrs: {id: 'block-2'},
                content: [{type: 'text', text: 'Middle'}],
            },
            document.content?.[2],
        ]);
        expect(document.content?.[0]?.content).toHaveLength(2);
        expect(document.content?.[1]?.content).toHaveLength(2);
    });
});
