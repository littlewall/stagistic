import {describe, expect, it} from 'vite-plus/test';

import {layoutBesideCards} from './layoutBesideCards';

const card = (threadId: string, blockId: string, anchorTop: number, height = 40) => ({threadId, blockId, anchorTop, height});
const base = {activeThreadId: null, expandedBlockId: null, collapsedHeight: 32, gap: 8};
const tops = (entries: ReturnType<typeof layoutBesideCards>) => entries.map(entry => [entry.key, entry.top]);

describe('layoutBesideCards', () => {
    it('keeps non-colliding cards at their anchors', () => {
        expect(tops(layoutBesideCards({...base, cards: [card('a', 'b1', 0), card('b', 'b2', 100)]}))).toEqual([
            ['a', 0],
            ['b', 100],
        ]);
    });

    it('pushes colliding cards down with a gap', () => {
        expect(tops(layoutBesideCards({...base, cards: [card('a', 'b1', 0), card('b', 'b2', 10), card('c', 'b3', 20)]}))).toEqual([
            ['a', 0],
            ['b', 48],
            ['c', 96],
        ]);
    });

    it('snaps the active card to its anchor and pushes earlier cards up', () => {
        expect(tops(layoutBesideCards({...base, activeThreadId: 'b', cards: [card('a', 'b1', 0), card('b', 'b2', 10), card('c', 'b3', 20)]}))).toEqual([
            ['a', -38],
            ['b', 10],
            ['c', 58],
        ]);
    });

    it('sorts by anchor position regardless of input order', () => {
        expect(tops(layoutBesideCards({...base, cards: [card('b', 'b2', 100), card('a', 'b1', 0)]}))).toEqual([
            ['a', 0],
            ['b', 100],
        ]);
    });

    it('collapses three threads on one block into one entry', () => {
        const entries = layoutBesideCards({...base, cards: [card('a', 'b1', 0), card('b', 'b1', 0), card('c', 'b1', 0), card('d', 'b2', 10)]});

        expect(entries.map(entry => ({key: entry.key, collapsed: entry.collapsed, threadIds: entry.threadIds, top: entry.top}))).toEqual([
            {key: 'group:b1', collapsed: true, threadIds: ['a', 'b', 'c'], top: 0},
            {key: 'd', collapsed: false, threadIds: ['d'], top: 40},
        ]);
    });

    it('does not collapse the expanded block or the block holding the active thread', () => {
        const cards = [card('a', 'b1', 0), card('b', 'b1', 0), card('c', 'b1', 0)];

        expect(layoutBesideCards({...base, expandedBlockId: 'b1', cards}).every(entry => !entry.collapsed)).toBe(true);
        expect(layoutBesideCards({...base, activeThreadId: 'b', cards}).every(entry => !entry.collapsed)).toBe(true);
    });

    it('returns nothing for no cards', () => {
        expect(layoutBesideCards({...base, cards: []})).toEqual([]);
    });
});
