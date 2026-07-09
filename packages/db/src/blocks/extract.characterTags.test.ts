import type {ScriptDocument} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {extractScriptBlocks} from './extract';

const doc: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene', attrs: {id: 's1'}, content: [{type: 'text', text: 'Scene 1'}],
        }, {
            type: 'stageDirection',
            attrs: {id: 'b1'},
            content: [
                {
                    type: 'text',
                    text: 'Anna',
                    marks: [{type: 'characterTag', attrs: {characterKey: 'ANNA', characterId: 'char-anna'}}],
                },
                {type: 'text', text: ' enters; '},
                {
                    type: 'text',
                    text: 'Bob',
                    marks: [{type: 'characterTag', attrs: {characterKey: 'BOB', characterId: null}}],
                },
                {type: 'text', text: ' waits.'},
            ],
        },
    ],
};

describe('extractScriptBlocks — character tags', () => {
    it('records confirmed tag refs and preserves the mark in contentJson', () => {
        const {blocks} = extractScriptBlocks('script-1', doc);
        const stageBlock = blocks.find(block => block.blockId === 'b1');

        expect(stageBlock?.characterRefByKey).toEqual({ANNA: 'char-anna'});
        expect(stageBlock?.contentJson).toContain('"type":"characterTag"');
    });
});
