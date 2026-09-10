import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {BlockNodeType} from '../blocks/script';
import type {BlockNextElementMap} from '../tiptap/scriptBlock/handlers';
import {
    type EnterHint,
    type EnterHintBlockState,
    resolveEnterHint,
} from './enterHint';

const DEFAULT_NEXT_ELEMENTS: BlockNextElementMap = {
    act: 'scene',
    aside: 'dialogue',
    character: 'dialogue',
    dialogue: 'character',
    lyrics: 'lyrics',
    note: 'stageDirection',
    scene: 'stageDirection',
    stageDirection: 'character',
};

/*
 * Caret at the end of a non-empty block - the position a writer is in almost
 * all of the time, and the only one where Enter advances the flow.
 */
const AT_END: EnterHintBlockState = {
    isEmpty: false,
    hasOnlyNonTextContent: false,
    isAtStart: false,
    isAtEnd: true,
    asideFlowTarget: null,
};

const resolve = (
    blockType: BlockNodeType,
    state: Partial<EnterHintBlockState> = {},
    blockNextElements: BlockNextElementMap = DEFAULT_NEXT_ELEMENTS,
): EnterHint => resolveEnterHint(blockType, blockNextElements, {
    ...AT_END,
    ...state,
});

describe('resolveEnterHint', () => {
    it.each([
        'scene',
        'stageDirection',
        'character',
    ] as const)(
        'reports the type chooser for an empty %s block',
        blockType => {
            expect(resolve(blockType, {
                isEmpty: true,
                isAtStart: true,
            })).toEqual({kind: 'chooser'});
        },
    );

    it.each([
        'aside',
        'dialogue',
        'lyrics',
    ] as const)(
        'reports character for an empty %s block',
        blockType => {
            expect(resolve(blockType, {
                isEmpty: true,
                isAtStart: true,
            })).toEqual({
                kind: 'blockType',
                blockType: 'character',
            });
        },
    );

    it('reports the configured next type for a block holding only a music atom', () => {
        expect(resolve('lyrics', {
            hasOnlyNonTextContent: true,
            isAtEnd: false,
        })).toEqual({
            kind: 'blockType',
            blockType: 'lyrics',
        });
    });

    it.each([
        {
            blockType: 'dialogue',
            expected: 'character',
        },
        {
            blockType: 'lyrics',
            expected: 'lyrics',
        },
        {
            blockType: 'scene',
            expected: 'stageDirection',
        },
        {
            blockType: 'act',
            expected: 'scene',
        },
    ] as const)(
        'reports the configured next type for $blockType with the caret at the block end',
        ({blockType, expected}) => {
            expect(resolve(blockType)).toEqual({
                kind: 'blockType',
                blockType: expected,
            });
        },
    );

    it.each([
        'dialogue',
        'scene',
        'act',
        'stageDirection',
    ] as const)(
        'reports the same type for %s when the caret splits mid-content',
        blockType => {
            expect(resolve(blockType, {isAtEnd: false})).toEqual({
                kind: 'blockType',
                blockType,
            });
        },
    );

    it('reports lyrics for an aside that interrupted a song', () => {
        expect(resolve('aside', {asideFlowTarget: 'lyrics'})).toEqual({
            kind: 'blockType',
            blockType: 'lyrics',
        });
    });

    it('reports the configured next type for an aside that interrupted spoken dialogue', () => {
        expect(resolve('aside', {asideFlowTarget: 'dialogue'})).toEqual({
            kind: 'blockType',
            blockType: 'dialogue',
        });
    });

    it('reports a stage direction for a character block with the caret at its start', () => {
        expect(resolve('character', {
            isAtEnd: false,
            isAtStart: true,
        })).toEqual({
            kind: 'blockType',
            blockType: 'stageDirection',
        });
    });

    it('falls back to the block default when no next element is configured', () => {
        expect(resolve('dialogue', {}, {})).toEqual({
            kind: 'blockType',
            blockType: 'character',
        });
    });
});
