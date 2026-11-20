import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ScriptNode} from '../document';
import {resolveBlockSpacingGroups} from './blockSpacingGroups';

const node = (type: string, content: ScriptNode[] = []): ScriptNode => ({type, content});

describe('block spacing groups', () => {
    it.each([
        'dialogue',
        'lyrics',
        'stageDirection',
        'character',
        'aside',
        'note',
    ])('groups consecutive %s including explicit empty paragraphs', type => {
        expect(resolveBlockSpacingGroups([
            node(type),
            node(type),
            node(type),
        ])).toEqual([
            {before: true, after: false},
            {before: false, after: false},
            {before: false, after: true},
        ]);
    });

    it.each(['act', 'scene'])('never groups structural %s headings', type => {
        expect(resolveBlockSpacingGroups([node(type), node(type)])).toEqual([{before: true, after: true}, {before: true, after: true}]);
    });

    it('keeps singleton and mixed-type margins', () => {
        expect(resolveBlockSpacingGroups([
            node('lyrics'),
            node('dialogue'),
            node('lyrics'),
        ])).toEqual(Array.from({length: 3}, () => ({before: true, after: true})));
    });

    it('starts and ends a group at music boundaries without splitting the lines inside a song', () => {
        const nodes = [
            node('lyrics'),
            node('lyrics', [node('musicStart')]),
            node('lyrics'),
            node('lyrics', [node('musicOut')]),
            node('lyrics'),
        ];

        expect(resolveBlockSpacingGroups(nodes)).toEqual([
            {before: true, after: true},
            {before: true, after: false},
            {before: false, after: false},
            {before: false, after: true},
            {before: true, after: true},
        ]);
    });
});
