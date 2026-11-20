import {buildScriptBlockIndex, type ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {resolveBoardInsertionTarget} from './boardInsertionTargets';

const value: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'a'},
            content: [],
        },
        {
            type: 'dialogue',
            attrs: {id: 'a-dialogue'},
            content: [],
        },
        {
            type: 'act',
            attrs: {id: 'b'},
            content: [],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'intro-b'},
            content: [],
        },
        {
            type: 'act',
            attrs: {id: 'c'},
            content: [],
        },
        {
            type: 'scene',
            attrs: {id: 'c-scene'},
            content: [],
        },
    ],
};
const index = buildScriptBlockIndex(value).snapshot;

describe('resolveBoardInsertionTarget', () => {
    it('uses the next act boundary when adding at the end of an act', () => {
        expect(resolveBoardInsertionTarget(index, null, null)).toEqual({beforeBlockId: 'b'});
        expect(resolveBoardInsertionTarget(index, 'b', null)).toEqual({beforeBlockId: 'c'});
        expect(resolveBoardInsertionTarget(index, 'c', null)).toEqual({beforeBlockId: null});
    });

    it('accepts only a scene in the requested act', () => {
        expect(resolveBoardInsertionTarget(index, 'c', 'c-scene')).toEqual({beforeBlockId: 'c-scene'});
        expect(resolveBoardInsertionTarget(index, 'b', 'c-scene')).toBeNull();
        expect(resolveBoardInsertionTarget(index, 'missing', null)).toBeNull();
        expect(resolveBoardInsertionTarget(index, 'c', 'missing')).toBeNull();
    });
});
