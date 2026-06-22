import {
    describe, expect, it,
} from 'vite-plus/test';

import {coerceUnknownBlocksToStageDirections} from './coerceUnknownBlocks';
import {
    DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
    type ScriptDocument,
    type ScriptNode,
} from './scriptDocument';

const block = (type: string, id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

const doc = (content: ScriptNode[]): ScriptDocument => ({type: 'doc', content});

describe('coerceUnknownBlocksToStageDirections', () => {
    it('rewrites an unknown top-level block type to the default stage direction', () => {
        const value = doc([
            {
                type: 'paragraph', attrs: {id: 'p1'}, content: [{type: 'text', text: 'x'}],
            },
        ]);

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(true);
        expect(result.value).not.toBe(value);
        expect(result.value.content[0].type).toBe(DEFAULT_SCRIPT_BLOCK_NODE_TYPE);
        expect(result.value.content[0].type).toBe('stageDirection');
    });

    it('leaves known block types untouched and returns the same reference', () => {
        const value = doc([block('scene', 's1', 'x'), block('dialogue', 'd1', 'y')]);

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(false);
        expect(result.value).toBe(value);
    });

    it('does not descend into child nodes', () => {
        const value = doc([
            {
                type: 'scene', attrs: {id: 's1'}, content: [{type: 'weird', content: []}],
            },
        ]);

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(false);
        expect(result.value.content[0].content?.[0].type).toBe('weird');
    });

    it('does not coerce loose text nodes', () => {
        const value = doc([{type: 'text', text: 'loose'}]);

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(false);
    });

    it('ignores nodes without a string type', () => {
        const value = doc([{attrs: {id: 'x'}, content: []}]);

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(false);
        expect(result.value).toBe(value);
    });

    it('returns the value unchanged when it is not a doc', () => {
        const value = {type: 'fragment', content: []} as unknown as ScriptDocument;

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(false);
        expect(result.value).toBe(value);
    });

    it('returns the value unchanged when content is not an array', () => {
        const value = {type: 'doc', content: undefined} as unknown as ScriptDocument;

        const result = coerceUnknownBlocksToStageDirections(value);

        expect(result.changed).toBe(false);
        expect(result.value).toBe(value);
    });
});
