import type {ScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildDeleteSceneHeadingContent,
    removeSceneBlockById,
} from './blockMutations';

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

const dialogue = (id: string, text: string) => ({
    type: 'dialogue',
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

const baseDoc = (): ScriptDocument => ({
    type: 'doc',
    attrs: {},
    content: [
        scene('s1', 'S1'),
        stageDirection('b1', 'x'),
        scene('s2', 'S2'),
    ],
});

const idsOf = (doc: ScriptDocument | null) => (doc?.content ?? []).map(node => node.attrs?.id);

describe('scene heading deletion helpers', () => {
    it('removes only the targeted scene block; following blocks remain as siblings', () => {
        const next = buildDeleteSceneHeadingContent(baseDoc(), 's2');

        expect(idsOf(next)).toEqual(['s1', 'b1']);
    });

    it('re-parents a non-first scene: its trailing blocks follow the previous scene', () => {
        const doc = baseDoc();
        const withTail: ScriptDocument = {
            ...doc,
            content: [...doc.content, dialogue('d1', 'line')],
        };

        const next = buildDeleteSceneHeadingContent(withTail, 's2');

        expect(idsOf(next)).toEqual([
            's1',
            'b1',
            'd1',
        ]);
    });

    it('returns null when the block id is not found', () => {
        expect(buildDeleteSceneHeadingContent(baseDoc(), 'nope')).toBeNull();
    });

    it('returns null when the block id is not a scene', () => {
        expect(buildDeleteSceneHeadingContent(baseDoc(), 'b1')).toBeNull();
    });

    it('preserves the document attrs on the returned document', () => {
        const doc = baseDoc();
        const attrs = {};

        doc.attrs = attrs;

        const next = buildDeleteSceneHeadingContent(doc, 's2');

        expect(next?.attrs).toBe(attrs);
    });

    it('removeSceneBlockById reports whether the scene was removed', () => {
        const [removed, didChange] = removeSceneBlockById(baseDoc().content, 's1');

        expect(didChange).toBe(true);
        expect(removed?.map(node => node.attrs?.id)).toEqual(['b1', 's2']);

        const [unchanged, noChange] = removeSceneBlockById(baseDoc().content, 'b1');

        expect(noChange).toBe(false);
        expect(unchanged?.map(node => node.attrs?.id)).toEqual([
            's1',
            'b1',
            's2',
        ]);
    });
});
