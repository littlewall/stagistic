import {
    describe, expect, it,
} from 'vite-plus/test';

import {extractScriptBlocks} from './extract';

describe('extractScriptBlocks music', () => {
    it('extracts a paired open music', () => {
        const doc = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'b1'},
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'c1', mode: 'open', title: 'Night', kind: null,
                            },
                        },
                    ],
                }, {
                    type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'musicOut'}],
                },
            ],
        };

        const {music} = extractScriptBlocks('s1', doc as never);

        expect(music).toEqual([
            {
                id: 'c1', sceneNumber: 0, indexInScene: 0, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2',
            },
        ]);
    });

    it('marks a hit with end = start and drops an orphan out', () => {
        const doc = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'b1'},
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'h1', mode: 'hit', title: 'Sting', kind: null,
                            },
                        },
                    ],
                }, {
                    type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'musicOut'}],
                },
            ],
        };

        const {music} = extractScriptBlocks('s1', doc as never);

        expect(music).toEqual([
            {
                id: 'h1', sceneNumber: 0, indexInScene: 0, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b1', endBlockId: 'b1',
            },
        ]);
    });
});
