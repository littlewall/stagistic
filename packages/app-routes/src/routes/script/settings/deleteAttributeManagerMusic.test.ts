import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {deleteAttributeManagerMusic} from './deleteAttributeManagerMusic';

describe('deleteAttributeManagerMusic', () => {
    it('persists assigned marker removal before deleting the catalog entry', async () => {
        const events: string[] = [];
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'block-1'},
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'music-1',
                                mode: 'hit',
                                title: 'Sting',
                                kind: 'instrumental',
                            },
                        },
                    ],
                },
            ],
        };

        await deleteAttributeManagerMusic({
            document,
            musicId: 'music-1',
            applyDocumentChange: change => {
                expect(change.changed).toBe(true);
                expect(change.value.content[0]?.content).toEqual([]);
                events.push('document');

                return Promise.resolve(true);
            },
            deleteMusic: () => {
                events.push('catalog');

                return Promise.resolve();
            },
        });

        expect(events).toEqual(['document', 'catalog']);
    });

    it('deletes unassigned music without publishing an unchanged document', async () => {
        const events: string[] = [];

        await deleteAttributeManagerMusic({
            document: {type: 'doc', content: []},
            musicId: 'music-1',
            applyDocumentChange: () => {
                events.push('document');

                return Promise.resolve(true);
            },
            deleteMusic: () => {
                events.push('catalog');

                return Promise.resolve();
            },
        });

        expect(events).toEqual(['catalog']);
    });
});
