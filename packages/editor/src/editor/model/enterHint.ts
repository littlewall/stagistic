import type {BlockNodeType} from '../blocks/script';
import {isEmptyEnterChooserWriterType} from '../tiptap/extensions/EmptyEnterChooserExtension';
import type {BlockNextElementMap} from '../tiptap/scriptBlock/handlers';
import {resolveNextTypeOnEnter} from '../tiptap/scriptBlock/handlers/enter';

/**
 * What a plain Enter would produce at the caret's current position: either a
 * block of a given type, or the empty-block type chooser.
 */
export type EnterHint =
    | {kind: 'chooser'}
    | {kind: 'blockType', blockType: BlockNodeType};

export interface EnterHintBlockState {
    isEmpty: boolean,
    hasOnlyNonTextContent: boolean,
    isAtStart: boolean,
    isAtEnd: boolean,
    /** For an aside, the flow it interrupted; null for every other block. */
    asideFlowTarget: BlockNodeType | null,
}

const asBlockType = (blockType: BlockNodeType): EnterHint => ({kind: 'blockType', blockType});

/*
 * Mirrors resolveAdvanceTypeOnEnter: an aside resumes a lyrics flow rather
 * than the configured next element.
 */
const resolveAdvanceType = (
    blockType: BlockNodeType,
    blockNextElements: BlockNextElementMap,
    state: EnterHintBlockState,
): BlockNodeType => blockType === 'aside' && state.asideFlowTarget === 'lyrics'
    ? 'lyrics'
    : resolveNextTypeOnEnter(blockType, blockNextElements);

/**
 * Mirrors handleEnter's branch order so the status bar can promise what Enter
 * will actually do from where the caret is right now. Kept deliberately in the
 * same sequence as the handler - if a branch moves there, it has to move here
 * too, and enterHint.test.ts pins each one.
 */
export const resolveEnterHint = (
    blockType: BlockNodeType,
    blockNextElements: BlockNextElementMap,
    state: EnterHintBlockState,
): EnterHint => {
    if (state.isEmpty && isEmptyEnterChooserWriterType(blockType)) {
        return {kind: 'chooser'};
    }

    /*
     * A block holding only a music atom keeps its content and gets a new
     * block after it, wherever the caret sits inside it.
     */
    if (state.hasOnlyNonTextContent) {
        return asBlockType(resolveAdvanceType(blockType, blockNextElements, state));
    }

    if (state.isEmpty && (blockType === 'aside' || blockType === 'dialogue' || blockType === 'lyrics')) {
        return asBlockType('character');
    }

    /*
     * The act handler resolves its own fallback rather than going through
     * getEnterFallback; keep the two spellings in step.
     */
    if (blockType === 'act') {
        return asBlockType(state.isAtEnd ? blockNextElements['act'] ?? 'scene' : 'act');
    }

    if (blockType === 'character' && state.isAtStart) {
        return asBlockType('stageDirection');
    }

    return asBlockType(
        state.isAtEnd ? resolveAdvanceType(blockType, blockNextElements, state) : blockType,
    );
};
