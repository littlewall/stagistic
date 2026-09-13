import {
    type Node as ProseMirrorNode,
    Schema,
} from '@tiptap/pm/model';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {BlockNodeType} from '../../scriptCore';
import {
    buildSceneCollapseRanges,
    findCollapsedSceneContainingPosition,
    findPreviousCollapsedScene,
    reconcileCollapsedSceneIds,
} from './sceneCollapseModel';

const createBlockSpec = (blockType: BlockNodeType) => ({
    group: 'block',
    content: 'text*',
    attrs: {
        id: {default: 'block-1'},
        blockType: {default: blockType},
    },
    toDOM: () => ['p', 0] as const,
    parseDOM: [{tag: 'p'}],
});

const schema = new Schema({
    nodes: {
        doc: {content: '(act | scene | stageDirection | dialogue)+'},
        text: {group: 'inline'},
        act: createBlockSpec('act'),
        scene: createBlockSpec('scene'),
        stageDirection: createBlockSpec('stageDirection'),
        dialogue: createBlockSpec('dialogue'),
    },
    marks: {},
});

type BlockDescriptor = {type: BlockNodeType, id: string};

const buildDoc = (blocks: readonly BlockDescriptor[]): ProseMirrorNode => schema.node(
    'doc',
    null,
    blocks.map(({type, id}) => schema.node(type, {blockType: type, id}, [schema.text(id)])),
);

const findBlockPosition = (doc: ProseMirrorNode, blockId: string) => {
    let position: number | null = null;

    doc.forEach((node, offset) => {
        if (node.attrs.id === blockId) {
            position = offset;
        }
    });

    if (position === null) {
        throw new Error(`Missing block ${blockId}`);
    }

    return Number(position);
};

const buildFixture = () => buildDoc([
    {type: 'act', id: 'a1'},
    {type: 'scene', id: 's1'},
    {type: 'stageDirection', id: 'b1'},
    {type: 'dialogue', id: 'b2'},
    {type: 'scene', id: 's2'},
    {type: 'act', id: 'a2'},
    {type: 'scene', id: 's3'},
]);

describe('scene collapse model', () => {
    it('builds scene bodies up to the next scene or act boundary', () => {
        const doc = buildFixture();
        const ranges = buildSceneCollapseRanges(doc);

        expect(ranges.map(range => ({
            id: range.sceneBlockId,
            bodyIds: range.bodyBlocks.map(block => block.blockId),
            nextId: range.nextBoundary?.blockId ?? null,
        }))).toEqual([
            {
                id: 's1', bodyIds: ['b1', 'b2'], nextId: 's2',
            },
            {
                id: 's2', bodyIds: [], nextId: 'a2',
            },
            {
                id: 's3', bodyIds: [], nextId: null,
            },
        ]);
    });

    it('reconciles requested ids in document order', () => {
        const ranges = buildSceneCollapseRanges(buildFixture());

        expect(reconcileCollapsedSceneIds(ranges, [
            'missing',
            's3',
            's1',
            's1',
        ]))
            .toEqual(['s1', 's3']);
    });

    it('finds hidden body positions but never the scene heading', () => {
        const doc = buildFixture();
        const ranges = buildSceneCollapseRanges(doc);
        const collapsedIds = new Set(['s1']);

        expect(findCollapsedSceneContainingPosition(
            ranges,
            collapsedIds,
            findBlockPosition(doc, 'b1') + 1,
        )?.sceneBlockId).toBe('s1');
        expect(findCollapsedSceneContainingPosition(
            ranges,
            collapsedIds,
            findBlockPosition(doc, 's1') + 1,
        )).toBeNull();
    });

    it('finds the collapsed scene immediately before a structural boundary', () => {
        const doc = buildFixture();
        const ranges = buildSceneCollapseRanges(doc);

        expect(findPreviousCollapsedScene(
            ranges,
            new Set(['s1']),
            findBlockPosition(doc, 's2'),
        )?.sceneBlockId).toBe('s1');
        expect(findPreviousCollapsedScene(
            ranges,
            new Set(['s3']),
            findBlockPosition(doc, 's2'),
        )).toBeNull();
    });
});
