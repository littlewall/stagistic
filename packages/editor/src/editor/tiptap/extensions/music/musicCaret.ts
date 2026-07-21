import {
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {
    EditorState,
    Transaction,
} from '@tiptap/pm/state';
import {TextSelection} from '@tiptap/pm/state';

import {getActiveScriptBlockFromState} from '../../scriptCore';

export const isMusicAtom = (node: ProseMirrorNode | null | undefined): boolean => {
    return node?.type.name === MUSIC_START_NODE_NAME || node?.type.name === MUSIC_OUT_NODE_NAME;
};

export const isCaretBeforeTrailingMusic = (state: EditorState): boolean => {
    const {selection} = state;
    const music = selection.$from.nodeAfter;

    return selection.empty
        && isMusicAtom(music)
        && selection.$from.parentOffset + (music?.nodeSize ?? 0) === selection.$from.parent.content.size;
};

export const moveCaretBeforeTrailingMusic = (
    state: EditorState,
    pos: number,
): Transaction | null => {
    const resolvedPos = state.doc.resolve(pos);
    const music = resolvedPos.nodeBefore;

    if (!music || !isMusicAtom(music) || resolvedPos.parentOffset !== resolvedPos.parent.content.size) {
        return null;
    }

    return state.tr
        .setSelection(TextSelection.create(state.doc, pos - music.nodeSize))
        .scrollIntoView();
};

export const moveCaretToNextBlockAfterTrailingMusic = (state: EditorState): Transaction | null => {
    if (!isCaretBeforeTrailingMusic(state)) {
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

export const moveCaretBeforeTrailingMusicInPreviousBlock = (
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
    const music = previousBlock?.lastChild;

    if (!music || !isMusicAtom(music)) {
        return null;
    }

    const musicPos = block.pos - 1 - music.nodeSize;

    return state.tr
        .setSelection(TextSelection.create(state.doc, musicPos))
        .scrollIntoView();
};
