import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildConvertSceneHeadingContent} from './blockMutations';

const scene = (id: string, text: string) => ({
    type: 'scene',
    attrs: {id},
    content: [{type: 'text', text}],
});

const stageDirection = (id: string, text: string) => ({
    type: 'stageDirection',
    attrs: {id},
    content: [{type: 'text', text}],
});

const baseDoc = (): ScriptDocument => ({
    type: 'doc',
    attrs: {},
    content: [
        scene('s1', 'S1'),
        stageDirection('b1', 'x'),
        scene('s2', 'INT. HOUSE'),
    ],
});

const typesOf = (doc: ScriptDocument | null) => (doc?.content ?? []).map(node => node.type);

describe('scene heading conversion helper', () => {
    it('changes the targeted scene block to the requested block type, keeping its text and id', () => {
        const next = buildConvertSceneHeadingContent(baseDoc(), 's2', 'stageDirection');

        expect(typesOf(next)).toEqual([
            'scene',
            'stageDirection',
            'stageDirection',
        ]);

        const converted = next?.content?.[2];

        expect(converted?.attrs?.id).toBe('s2');
        expect(converted?.content).toEqual([{type: 'text', text: 'INT. HOUSE'}]);
    });

    it('converts to dialogue as well', () => {
        const next = buildConvertSceneHeadingContent(baseDoc(), 's1', 'dialogue');

        expect(typesOf(next)).toEqual([
            'dialogue',
            'stageDirection',
            'scene',
        ]);
    });

    it('returns null when the block id is not found', () => {
        expect(buildConvertSceneHeadingContent(baseDoc(), 'nope', 'dialogue')).toBeNull();
    });

    it('returns null when the block id is not a scene', () => {
        expect(buildConvertSceneHeadingContent(baseDoc(), 'b1', 'dialogue')).toBeNull();
    });

    it('returns null when the target type is scene (no-op conversion)', () => {
        expect(buildConvertSceneHeadingContent(baseDoc(), 's2', 'scene')).toBeNull();
    });

    it('preserves the document attrs on the returned document', () => {
        const doc = baseDoc();
        const attrs = {};

        doc.attrs = attrs;

        const next = buildConvertSceneHeadingContent(doc, 's2', 'dialogue');

        expect(next?.attrs).toBe(attrs);
    });
});
