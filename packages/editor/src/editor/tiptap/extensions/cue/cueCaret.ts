import {
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {
    EditorState,
    Transaction,
} from '@tiptap/pm/state';
import {TextSelection} from '@tiptap/pm/state';

import {getActiveScriptBlockFromState} from '../../scriptCore';

export const isCueAtom = (node: ProseMirrorNode | null | undefined): boolean => {
    return node?.type.name === CUE_START_NODE_NAME || node?.type.name === CUE_OUT_NODE_NAME;
};

export const isCaretBeforeTrailingCue = (state: EditorState): boolean => {
    const {selection} = state;
    const cue = selection.$from.nodeAfter;

    return selection.empty
        && isCueAtom(cue)
        && selection.$from.parentOffset + (cue?.nodeSize ?? 0) === selection.$from.parent.content.size;
};

export const moveCaretBeforeTrailingCue = (
    state: EditorState,
    pos: number,
): Transaction | null => {
    const resolvedPos = state.doc.resolve(pos);
    const cue = resolvedPos.nodeBefore;

    if (!cue || !isCueAtom(cue) || resolvedPos.parentOffset !== resolvedPos.parent.content.size) {
        return null;
    }

    return state.tr
        .setSelection(TextSelection.create(state.doc, pos - cue.nodeSize))
        .scrollIntoView();
};

export const moveCaretToNextBlockAfterTrailingCue = (state: EditorState): Transaction | null => {
    if (!isCaretBeforeTrailingCue(state)) {
        return null;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block) {
        return null;
    }

    const nextBlockBoundary = block.pos + block.node.nodeSize;

    if (nextBlockBoundary >= state.doc.content.size) {
        return null;
    }

    return state.tr
        .setSelection(TextSelection.near(state.doc.resolve(nextBlockBoundary), 1))
        .scrollIntoView();
};

export const moveCaretBeforeTrailingCueInPreviousBlock = (
    state: EditorState,
): Transaction | null => {
    const {selection} = state;

    if (!selection.empty || selection.$from.parentOffset !== 0) {
        return null;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.pos === 0) {
        return null;
    }

    const previousBlock = state.doc.resolve(block.pos).nodeBefore;
    const cue = previousBlock?.lastChild;

    if (!cue || !isCueAtom(cue)) {
        return null;
    }

    const cuePos = block.pos - 1 - cue.nodeSize;

    return state.tr
        .setSelection(TextSelection.create(state.doc, cuePos))
        .scrollIntoView();
};
