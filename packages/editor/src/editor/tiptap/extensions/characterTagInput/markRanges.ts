import {getMarkRange} from '@tiptap/core';
import type {
    Mark,
    MarkType,
} from '@tiptap/pm/model';
import type {EditorState} from '@tiptap/pm/state';

import {readCharacterTagId} from '../../scriptBlock/characterTagMarkCommands';
import {isPendingTagSpaceGap} from './text';

export interface EndTypingTagRange {
    from: number,
    to: number,
    replaceTo: number,
}

export const charAt = (state: EditorState, pos: number): string => {
    if (pos < 0 || pos + 1 > state.doc.content.size) {
        return '';
    }

    return state.doc.textBetween(pos, pos + 1, '\n', '\n');
};

export const readCharacterTagMarkAt = (
    state: EditorState,
    pos: number,
    markType: MarkType,
): Mark | null => {
    let result: Mark | null = null;

    state.doc.nodesBetween(pos, pos + 1, child => {
        const mark = child.marks.find(candidate => candidate.type === markType);

        if (mark) {
            result = mark;
        }

        return false;
    });

    return result;
};

export const isCharacterTagMarkedAt = (
    state: EditorState,
    pos: number,
    markType: MarkType,
): boolean => {
    return readCharacterTagMarkAt(state, pos, markType) !== null;
};

export const readCommittedTagCharacterId = (
    state: EditorState,
    from: number,
    to: number,
    markType: MarkType,
): string | null => {
    let characterId: string | null = null;

    state.doc.nodesBetween(from, to, child => {
        const mark = child.marks.find(candidate => candidate.type === markType);

        if (mark) {
            characterId = readCharacterTagId(mark);
        }
    });

    return characterId;
};

export const findCommittedTagBeforeCursor = (
    state: EditorState,
    markType: MarkType,
): {from: number, to: number} | null => {
    const cursor = state.selection.from;

    for (let probe = cursor; probe >= cursor - 4 && probe > 0; probe -= 1) {
        const range = getMarkRange(state.doc.resolve(probe), markType);

        if (range) {
            return range;
        }
    }

    return null;
};

export const findTagRangeForEndTyping = (
    state: EditorState,
    markType: MarkType,
): EndTypingTagRange | null => {
    const cursor = state.selection.from;
    const directRange = getMarkRange(state.selection.$from, markType);

    if (directRange && directRange.to === cursor) {
        return {...directRange, replaceTo: cursor};
    }

    const minProbe = Math.max(0, cursor - 2);

    for (let probe = cursor - 1; probe >= minProbe; probe -= 1) {
        const previousRange = getMarkRange(state.doc.resolve(probe), markType);

        if (!previousRange || previousRange.to > cursor) {
            continue;
        }

        const gap = state.doc.textBetween(previousRange.to, cursor, '\n', '\n');

        if (previousRange.to === cursor || isPendingTagSpaceGap(gap)) {
            return {...previousRange, replaceTo: cursor};
        }
    }

    return null;
};

export const findTagRangeForConfirm = (
    state: EditorState,
    markType: MarkType,
): {from: number, to: number} | null => {
    const cursor = state.selection.from;
    const directRange = getMarkRange(state.selection.$from, markType);

    if (directRange && cursor >= directRange.from && cursor <= directRange.to) {
        return directRange;
    }

    if (cursor > 0) {
        const previousRange = getMarkRange(state.doc.resolve(cursor - 1), markType);

        if (previousRange && previousRange.to === cursor) {
            return previousRange;
        }
    }

    if (cursor + 1 <= state.doc.content.size) {
        const nextRange = getMarkRange(state.doc.resolve(cursor + 1), markType);

        if (nextRange && nextRange.from === cursor) {
            return nextRange;
        }
    }

    return null;
};

export const findProtectedTagSeparator = (
    state: EditorState,
    markType: MarkType,
    spaceFrom: number,
): {from: number, to: number} | null => {
    if (spaceFrom < 0 || charAt(state, spaceFrom) !== ' ') {
        return null;
    }

    const previousRange = getMarkRange(state.doc.resolve(spaceFrom), markType);
    const nextRange = spaceFrom + 1 <= state.doc.content.size
        ? getMarkRange(state.doc.resolve(spaceFrom + 1), markType)
        : null;

    if (!previousRange || !nextRange) {
        return null;
    }

    return previousRange.to === spaceFrom && nextRange.from === spaceFrom + 1
        ? {
            from: spaceFrom,
            to: spaceFrom + 1,
        }
        : null;
};
