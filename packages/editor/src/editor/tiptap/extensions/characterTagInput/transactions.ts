import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {getMarkRange} from '@tiptap/core';
import type {MarkType} from '@tiptap/pm/model';
import {
    type EditorState,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';

import type {PersistentCharacterRef} from '../../../contracts';
import {
    getCharacterTagComposeFromState,
    getOpenComposeOptions,
} from './composeState';
import {
    CLOSE_META_KEY,
    OPEN_META_KEY,
    PLACEHOLDER_CHARACTER,
} from './constants';
import {
    findTagRangeForEndTyping,
    isCharacterTagMarkedAt,
} from './markRanges';
import {
    isPlaceholderText,
    normalizeCommittedTagName,
    trimTrailingTagSpaces,
} from './text';
import type {CommitCharacterTagPayload} from './types';

export const buildOpenComposeTransaction = (
    state: EditorState,
    from: number,
    to: number,
): Transaction | null => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const openComposeOptions = getOpenComposeOptions(state, from);

    if (!markType || !openComposeOptions) {
        return null;
    }

    const activeTagRange = findTagRangeForEndTyping(state, markType);

    if (activeTagRange && from === to && from === activeTagRange.replaceTo) {
        return null;
    }

    const {
        insertLeadingSpace,
    } = openComposeOptions;
    const mark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: '',
        [CHARACTER_TAG_ID_ATTR]: null,
    });
    let tr = state.tr;
    let composeFrom = from;

    if (insertLeadingSpace) {
        tr = tr.insertText(' ', from);
        composeFrom += 1;
    }

    tr = tr.replaceWith(
        composeFrom,
        composeFrom + (to - from),
        state.schema.text(PLACEHOLDER_CHARACTER, [mark]),
    );

    return tr
        .setMeta(OPEN_META_KEY, composeFrom)
        .setSelection(TextSelection.create(tr.doc, composeFrom + 1))
        .scrollIntoView();
};

export const buildEditCommittedTagTransaction = (
    state: EditorState,
    pos: number,
): Transaction | null => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || pos < 0 || pos > state.doc.content.size) {
        return null;
    }

    const range = getMarkRange(state.doc.resolve(pos), markType);

    if (!range) {
        return null;
    }

    // Keep the caret where the user clicked instead of forcing it to the tag
    // end. Clamp to inside the tag (>= range.from + 1) so the reopened compose
    // region stays valid.
    const caret = Math.min(Math.max(pos, range.from + 1), range.to);

    return state.tr
        .setSelection(TextSelection.create(state.doc, caret))
        .setMeta(OPEN_META_KEY, range.from)
        .scrollIntoView();
};

export const buildAbandonComposeTransaction = (
    state: EditorState,
    from: number,
): Transaction | null => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || from < 0 || from + 1 > state.doc.content.size) {
        return null;
    }

    if (!isCharacterTagMarkedAt(state, from, markType)) {
        return null;
    }

    const range = getMarkRange(state.doc.resolve(from + 1), markType);

    if (!range || range.from !== from) {
        return null;
    }

    const text = state.doc.textBetween(range.from, range.to, '\n', '\n');
    const trimmedText = trimTrailingTagSpaces(text);

    if (isPlaceholderText(text) || trimmedText.length === 0) {
        return state.tr
            .delete(range.from, range.to)
            .setMeta(CLOSE_META_KEY, true);
    }

    if (trimmedText.length < text.length) {
        return state.tr
            .delete(range.from + trimmedText.length, range.to)
            .setMeta(CLOSE_META_KEY, true);
    }

    return state.tr.setMeta(CLOSE_META_KEY, true);
};

const isSelectionInsideRange = (
    state: EditorState,
    from: number,
    to: number,
) => {
    const {selection} = state;

    return selection.from >= from && selection.to <= to;
};

export const buildTrailingTagSpaceCleanupTransaction = (
    oldState: EditorState,
    newState: EditorState,
): Transaction | null => {
    if (!oldState.selection.empty || !oldState.doc.eq(newState.doc)) {
        return null;
    }

    const markType = oldState.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForEndTyping(oldState, markType) : null;

    if (!range || isSelectionInsideRange(newState, range.from, range.replaceTo)) {
        return null;
    }

    const text = oldState.doc.textBetween(range.from, range.replaceTo, '\n', '\n');
    const trimmedText = trimTrailingTagSpaces(text);

    if (trimmedText.length === text.length) {
        return null;
    }

    if (trimmedText.length === 0) {
        return newState.tr
            .delete(range.from, range.replaceTo)
            .setMeta(CLOSE_META_KEY, true);
    }

    return newState.tr
        .delete(range.from + trimmedText.length, range.replaceTo)
        .setMeta(CLOSE_META_KEY, true);
};

const resolveConfirmedCharacterId = (
    key: string,
    persistentCharacters: readonly PersistentCharacterRef[],
): string | null => {
    if (key.length === 0) {
        return null;
    }

    const match = persistentCharacters.find(character => normalizeCharacterKey(character.key) === key);
    const id = typeof match?.id === 'string' ? match.id.trim() : '';

    return id.length > 0 ? id : null;
};

export const resolveConfirmedCharacterIdForName = (
    name: string,
    persistentCharacters: readonly PersistentCharacterRef[],
) => {
    return resolveConfirmedCharacterId(normalizeCharacterKey(name), persistentCharacters);
};

const buildCommittedTagInsertion = (
    state: EditorState,
    markType: MarkType,
    from: number,
    to: number,
    name: string,
    characterId: string | null,
    trailingSpace: boolean,
): Transaction => {
    const mark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(name),
        [CHARACTER_TAG_ID_ATTR]: characterId,
    });
    let tr = state.tr.replaceWith(from, to, state.schema.text(name, [mark]));
    let caret = from + name.length;

    if (trailingSpace) {
        tr = tr.insertText(' ', caret);
        caret += 1;
    }

    return tr
        .setSelection(TextSelection.create(tr.doc, caret))
        .removeStoredMark(markType);
};

export const buildCommittedTagExitTransaction = (
    state: EditorState,
    markType: MarkType,
    from: number,
    to: number,
    name: string,
    characterId: string | null,
): Transaction | null => {
    if (normalizeCharacterKey(name).length === 0) {
        return null;
    }

    return buildCommittedTagInsertion(state, markType, from, to, name, characterId, true);
};

export const buildCommitTransaction = (
    state: EditorState,
    persistentCharacters: readonly PersistentCharacterRef[],
    payload?: CommitCharacterTagPayload,
): Transaction | null => {
    const compose = getCharacterTagComposeFromState(state);

    if (!compose) {
        return null;
    }

    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType) {
        return null;
    }

    const rawName = normalizeCommittedTagName(payload?.name ?? compose.query);
    const key = normalizeCharacterKey(rawName);

    if (rawName.length === 0 || key.length === 0) {
        return state.tr.delete(compose.from, compose.to).setMeta(CLOSE_META_KEY, true);
    }

    const characterId = resolveConfirmedCharacterId(key, persistentCharacters);

    return buildCommittedTagInsertion(
        state,
        markType,
        compose.from,
        compose.to,
        rawName,
        characterId,
        Boolean(payload?.trailingSpace),
    )
        .setMeta(CLOSE_META_KEY, true)
        .scrollIntoView();
};
