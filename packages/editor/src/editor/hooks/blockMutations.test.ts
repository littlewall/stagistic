import type {
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';
import {
    ensureSceneHeading,
    getScriptBlockNodeType,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildDeleteActContent} from './blockMutations';

const block = (type: string, id: string): ScriptNode => ({
    type,
    attrs: {id},
    content: [],
});

describe('buildDeleteActContent', () => {
    it('removes the first act without removing or moving its scenes', () => {
        const firstScene = block('scene', 'scene-1');
        const secondScene = block('scene', 'scene-2');
        const document: ScriptDocument = {
            type: 'doc',
            content: [
                block('act', 'act-1'),
                firstScene,
                block('act', 'act-2'),
                secondScene,
            ],
        };

        const result = buildDeleteActContent(document, 'act-1');

        expect(result.didChange).toBe(true);
        expect(result.nextContent).toEqual([
            firstScene,
            block('act', 'act-2'),
            secondScene,
        ]);
        expect(result.nextContent?.[0]).toBe(firstScene);
        expect(result.nextContent?.[2]).toBe(secondScene);
    });

    it('keeps the result actless after loader normalization', () => {
        const document: ScriptDocument = {
            type: 'doc',
            content: [block('act', 'act-1'), block('scene', 'scene-1')],
        };
        const result = buildDeleteActContent(document, 'act-1');
        const reloaded = ensureSceneHeading({
            type: 'doc',
            content: result.nextContent ?? [],
        });

        expect(reloaded.content.map(node => getScriptBlockNodeType(node)))
            .toEqual(['scene']);
    });
});
