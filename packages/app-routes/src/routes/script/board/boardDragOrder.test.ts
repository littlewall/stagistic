import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    applyBoardOrder,
    findBoardPlacement,
    moveInBoardOrder,
    toBoardOrder,
} from './boardDragOrder';
import type {WallAct, WallScene} from './buildWallView';

const scene = (id: string): WallScene => ({
    headingBlockId: id,
    number: 0,
    title: id,
    page: null,
    synopsis: null,
    isCollapsed: false,
    chips: [],
});

const acts: WallAct[] = [
    {
        key: 'one',
        name: 'ONE',
        scenes: [
            scene('a'),
            scene('b'),
            scene('c'),
        ],
    },
    {
        key: 'two',
        name: 'TWO',
        scenes: [scene('d')],
    },
    {
        key: 'three',
        name: 'THREE',
        scenes: [],
    },
];
const order = toBoardOrder(acts);

describe('moveInBoardOrder', () => {
    it('lands after a later card and before an earlier one within an act', () => {
        expect(moveInBoardOrder(order, 'a', 'b').one).toEqual([
            'b',
            'a',
            'c',
        ]);
        expect(moveInBoardOrder(order, 'c', 'a').one).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    it('takes the place of a card in another act, or the end of an act', () => {
        expect(moveInBoardOrder(order, 'b', 'd')).toEqual({
            one: ['a', 'c'],
            two: ['b', 'd'],
            three: [],
        });
        expect(moveInBoardOrder(order, 'b', 'two')).toEqual({
            one: ['a', 'c'],
            two: ['d', 'b'],
            three: [],
        });
        expect(moveInBoardOrder(order, 'a', 'three').three).toEqual(['a']);
        expect(moveInBoardOrder(order, 'a', 'one').one).toEqual([
            'b',
            'c',
            'a',
        ]);
    });

    it('keeps the same order object when nothing moves', () => {
        expect(moveInBoardOrder(order, 'c', 'one')).toBe(order);
        expect(moveInBoardOrder(order, 'a', 'a')).toBe(order);
        expect(moveInBoardOrder(order, 'missing', 'a')).toBe(order);
    });
});

describe('findBoardPlacement and applyBoardOrder', () => {
    it('names the scene that follows, and shows the acts in the dragged order', () => {
        const moved = moveInBoardOrder(order, 'a', 'd');

        expect(findBoardPlacement(moved, 'a')).toEqual({group: 'two', beforeSceneId: 'd'});
        expect(findBoardPlacement(order, 'c')).toEqual({group: 'one', beforeSceneId: null});
        expect(applyBoardOrder(acts, moved).map(act => act.scenes.map(item => item.headingBlockId))).toEqual([
            ['b', 'c'],
            ['a', 'd'],
            [],
        ]);
        expect(applyBoardOrder(acts, null)).toBe(acts);
    });
});
