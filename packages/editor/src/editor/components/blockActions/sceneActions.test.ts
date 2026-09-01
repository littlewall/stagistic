import {
    type Node as ProseMirrorNode,
    Schema,
} from '@tiptap/pm/model';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {BlockNodeType} from '../../tiptap/scriptCore';
import {isFirstSceneBlock} from './sceneActions';

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
        doc: {content: '(scene | stageDirection | dialogue)+'},
        text: {group: 'inline'},
        scene: createBlockSpec('scene'),
        stageDirection: createBlockSpec('stageDirection'),
        dialogue: createBlockSpec('dialogue'),
    },
    marks: {},
});

type BlockDescriptor = {type: BlockNodeType, id: string};

const buildDoc = (blocks: BlockDescriptor[]): ProseMirrorNode => schema.node(
    'doc',
    null,
    blocks.map(({type, id}) => schema.node(type, {blockType: type, id}, [schema.text('x')])),
);

describe('isFirstSceneBlock', () => {
    it('detects the first scene block in document order', () => {
        const doc = buildDoc([{type: 'scene', id: 's1'}, {type: 'scene', id: 's2'}]);

        expect(isFirstSceneBlock(doc, 's1')).toBe(true);
        expect(isFirstSceneBlock(doc, 's2')).toBe(false);
    });

    it('resolves the first scene by document order even when a non-scene precedes it', () => {
        const doc = buildDoc([
            {type: 'stageDirection', id: 'b1'},
            {type: 'scene', id: 's1'},
            {type: 'scene', id: 's2'},
        ]);

        expect(isFirstSceneBlock(doc, 's1')).toBe(true);
        expect(isFirstSceneBlock(doc, 's2')).toBe(false);
    });

    it('never reports a non-scene block as the first scene', () => {
        const doc = buildDoc([{type: 'stageDirection', id: 'b1'}, {type: 'scene', id: 's1'}]);

        expect(isFirstSceneBlock(doc, 'b1')).toBe(false);
    });

    it('returns false when the document has no scene at all', () => {
        const doc = buildDoc([{type: 'stageDirection', id: 'b1'}, {type: 'dialogue', id: 'd1'}]);

        expect(isFirstSceneBlock(doc, 'b1')).toBe(false);
    });
});
