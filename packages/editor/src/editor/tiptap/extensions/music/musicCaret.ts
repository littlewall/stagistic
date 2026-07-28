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

const hasOnlyTrailingMusicAtoms = (state: EditorState, pos: number): boolean => {
    const $pos = state.doc.resolve(pos);
    let offset = $pos.parentOffset;

    while (offset < $pos.parent.content.size) {
        const child = $pos.parent.childAfter(offset).node;

        if (!child || !isMusicAtom(child)) {
            return false;
        }

        offset += child.nodeSize;
    }

    return offset > $pos.parentOffset;
};

export const isCaretBeforeTrailingMusic = (state: EditorState): boolean => {
    const {selection} = state;
    const music = selection.$from.nodeAfter;

    return selection.empty && isMusicAtom(music) && hasOnlyTrailingMusicAtoms(state, selection.from);
};

export const moveCaretBeforeTrailingMusic = (
    state: EditorState,
    pos: number,
): Transaction | null => {
    const resolvedPos = state.doc.resolve(pos);

    if (!isMusicAtom(resolvedPos.nodeBefore) || resolvedPos.parentOffset !== resolvedPos.parent.content.size) {
        return null;
    }

    let targetPos = pos;
    let cursor = state.doc.resolve(targetPos);

    while (isMusicAtom(cursor.nodeBefore)) {
        targetPos -= cursor.nodeBefore?.nodeSize ?? 0;
        cursor = state.doc.resolve(targetPos);
    }

    return state.tr
        .setSelection(TextSelection.create(state.doc, targetPos))
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

    if (!previousBlock || !isMusicAtom(previousBlock.lastChild)) {
        return null;
    }

    let trailingSize = 0;

    for (let index = previousBlock.childCount - 1; index >= 0; index -= 1) {
        const child = previousBlock.child(index);

        if (!isMusicAtom(child)) {
            break;
        }

        trailingSize += child.nodeSize;
    }

    const musicPos = block.pos - 1 - trailingSize;

    return state.tr
        .setSelection(TextSelection.create(state.doc, musicPos))
        .scrollIntoView();
};
