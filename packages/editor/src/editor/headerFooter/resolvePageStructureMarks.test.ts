import {
    describe, expect, it,
} from 'vite-plus/test';

import {resolvePageStructureMarks} from './resolvePageStructureMarks';

describe('resolvePageStructureMarks', () => {
    const blocks = [
        {pos: 0, blockType: 'act'},
        {pos: 5, blockType: 'scene'},
        {pos: 10, blockType: 'stageDirection'},
        {pos: 20, blockType: 'scene'},
        {pos: 30, blockType: 'act'},
        {pos: 35, blockType: 'scene'},
    ];

    it('attributes each page to the act/scene active at its start', () => {
        const marks = resolvePageStructureMarks(blocks, [
            {startPos: 0},
            {startPos: 12},
            {startPos: 32},
        ]);

        expect(marks).toEqual([
            {actIndex: 1, sceneNumber: 0},
            {actIndex: 1, sceneNumber: 1},
            {actIndex: 2, sceneNumber: 2},
        ]);
    });

    it('returns a null act when no act precedes the page', () => {
        const marks = resolvePageStructureMarks(
            [{pos: 0, blockType: 'scene'}, {pos: 4, blockType: 'dialogue'}],
            [{startPos: 2}],
        );

        expect(marks).toEqual([{actIndex: null, sceneNumber: 1}]);
    });
});
