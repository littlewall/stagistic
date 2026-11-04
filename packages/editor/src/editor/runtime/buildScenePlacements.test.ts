import {
    type BlockLine,
    paginate,
    type PaginatorBlock,
} from '@stagistic/script-pagination';
import {Schema} from '@tiptap/pm/model';
import type {EditorView} from '@tiptap/pm/view';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {PaginationState} from '../tiptap/extensions/pagination/types';
import {buildBlockPages} from './buildBlockPages';
import {buildScenePlacements} from './buildScenePlacements';

const LINE = 20;
const block = (blockType: string) => ({
    group: 'block',
    content: 'text*',
    attrs: {id: {default: ''}, blockType: {default: blockType}},
    toDOM: () => ['p', 0] as const,
});
const schema = new Schema({
    nodes: {
        doc: {content: 'block+'},
        text: {group: 'inline'},
        scene: block('scene'),
        dialogue: block('dialogue'),
    },
    marks: {},
});

type Spec = [type: string, id: string, text: string];

const viewOf = (specs: Spec[]) => ({
    state: {
        doc: schema.node('doc', null, specs.map(([
            type,
            id,
            text,
        ]) => schema.node(type, {id}, schema.text(text)))),
    },
}) as unknown as EditorView;

/** Runs the real paginator over the doc, one line per 4 characters, keys = document offsets. */
const paginationOf = (view: EditorView): PaginationState => {
    const paginatorBlocks: PaginatorBlock[] = [];

    view.state.doc.forEach((node, offset) => {
        const lineCount = Math.max(1, Math.ceil(node.textContent.length / 4));
        const lines: BlockLine[] = Array.from({length: lineCount}, (_unused, index) => ({
            startPos: offset + 1 + index * 4,
            topRel: index * LINE,
        }));

        paginatorBlocks.push({
            key: String(offset),
            endKey: String(offset + node.nodeSize - 1),
            height: lineCount * LINE,
            splittable: node.attrs.blockType === 'dialogue',
            orphanCandidate: node.attrs.blockType === 'scene',
            getLineMap: () => ({lines, cleanHeight: lineCount * LINE}),
        });
    });

    const plan = paginate(paginatorBlocks, {
        contentHeight: 100,
        topSpacing: 10,
        bottomSpacing: 10,
        orphanThreshold: 2 * LINE,
        minLinesBefore: 2,
        minLinesAfter: 2,
        epsilonPx: 1,
    });

    return {
        blockOffsets: plan.blockOffsets,
        pages: plan.pages.map(page => ({
            index: page.index,
            startPos: Number(page.startKey),
            endPos: Number(page.endKey),
            startOffset: page.startOffset,
            endOffset: page.endOffset,
            continuesBlock: page.continuesBlock,
        })),
    } as unknown as PaginationState;
};

const long = 'x'.repeat(4 * 12);
const specs: Spec[] = [
    [
        'scene',
        's1',
        'abcd',
    ],
    [
        'dialogue',
        'd1',
        long,
    ],
    [
        'dialogue',
        'd2',
        'abcd',
    ],
    [
        'scene',
        's2',
        'abcd',
    ],
];

describe('block pages from real pagination', () => {
    it('a block split over three pages starts where it begins and ends where it ends', () => {
        const view = viewOf(specs);
        const pagination = paginationOf(view);
        const {byBlockId} = buildBlockPages(view, pagination);

        expect(pagination.pages.length).toBeGreaterThanOrEqual(3);
        expect(byBlockId.get('s1')).toMatchObject({startPage: 1, endPage: 1});
        expect(byBlockId.get('d1')).toMatchObject({startPage: 1, endPage: 3});
        expect(byBlockId.get('d2')?.startPage).toBe(3);
    });

    it('positions blocks as page floats: page index plus how far down the page', () => {
        const view = viewOf(specs);
        const pagination = paginationOf(view);
        const {byBlockId} = buildBlockPages(view, pagination);
        const [page1] = pagination.pages;
        const s1 = byBlockId.get('s1');
        const d1 = byBlockId.get('d1');

        // s1 is one line (20) at the top of page one.
        expect(s1?.startAt).toBe(0);
        expect(s1?.endAt).toBeCloseTo(LINE / (page1.endOffset - page1.startOffset), 5);
        // d1 starts right under it and runs into page three.
        expect(d1?.startAt).toBeCloseTo(s1?.endAt ?? Number.NaN, 5);
        expect(d1?.endAt).toBeGreaterThan(2);
        expect(d1?.endAt).toBeLessThan(3);
    });

    it('a block that starts on a continuation-free later page keeps its own start', () => {
        const view = viewOf(specs);
        const {byBlockId} = buildBlockPages(view, paginationOf(view));

        expect(byBlockId.get('s2')?.startPage).toBe(byBlockId.get('s2')?.endPage);
    });

    it('marks a block with no height as hidden (a collapsed scene body)', () => {
        const view = viewOf(specs);
        const pagination = paginationOf(view);
        const d2Key = pagination.blockOffsets.find(item => item.endOffset > item.startOffset
            && item.key !== '0' && Number(item.key) > 0)?.key;
        const collapsed = {
            ...pagination,
            blockOffsets: pagination.blockOffsets.map(item => (
                item.key === d2Key ? {...item, endOffset: item.startOffset} : item
            )),
        };
        const {byBlockId} = buildBlockPages(view, collapsed);

        expect(byBlockId.get('s1')?.isHidden).toBe(false);
        expect(Array.from(byBlockId.values()).filter(item => item.isHidden)).toHaveLength(1);
    });

    it('fingerprint changes only when a page changes', () => {
        const view = viewOf(specs);
        const pagination = paginationOf(view);
        const a = buildBlockPages(view, pagination).fingerprint;
        const shorter = viewOf([specs[0], specs[3]]);

        expect(buildBlockPages(view, pagination).fingerprint).toBe(a);
        expect(buildBlockPages(shorter, paginationOf(shorter)).fingerprint).not.toBe(a);
    });
});

describe('buildScenePlacements', () => {
    it('keeps the scene-only {startPage} contract', () => {
        const view = viewOf(specs);
        const {byBlockId} = buildScenePlacements(view, paginationOf(view));

        expect([...byBlockId.keys()]).toEqual(['s1', 's2']);
        expect(byBlockId.get('s1')).toEqual({startPage: 1});
    });
});
