import {
    describe, expect, it,
} from 'vite-plus/test';

import {extractScriptBlocks} from './extract';

describe('extractScriptBlocks cues', () => {
    it('extracts a paired open cue', () => {
        const doc = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'b1'},
                    content: [
                        {
                            type: 'cueStart',
                            attrs: {
                                cueId: 'c1', mode: 'open', title: 'Night', kind: null,
                            },
                        },
                    ],
                }, {
                    type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}],
                },
            ],
        };

        const {cues} = extractScriptBlocks('s1', doc as never);

        expect(cues).toEqual([
            {
                id: 'c1', cueNumber: 1, mode: 'open', title: 'Night', kind: null, startBlockId: 'b1', endBlockId: 'b2',
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
                            type: 'cueStart',
                            attrs: {
                                cueId: 'h1', mode: 'hit', title: 'Sting', kind: null,
                            },
                        },
                    ],
                }, {
                    type: 'stageDirection', attrs: {id: 'b2'}, content: [{type: 'cueOut'}],
                },
            ],
        };

        const {cues} = extractScriptBlocks('s1', doc as never);

        expect(cues).toEqual([
            {
                id: 'h1', cueNumber: 1, mode: 'hit', title: 'Sting', kind: null, startBlockId: 'b1', endBlockId: 'b1',
            },
        ]);
    });
});
