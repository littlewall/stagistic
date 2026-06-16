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
    canOpenCompose,
    getCharacterTagComposeFromState,
} from './composeState';
import {
    CLOSE_META_KEY,
    PLACEHOLDER_CHARACTER,
} from './constants';
import {
    isCharacterTagMarkedAt,
} from './markRanges';
import {
    isPlaceholderText,
} from './text';
import type {CommitCharacterTagPayload} from './types';

export const buildOpenComposeTransaction = (
    state: EditorState,
    from: number,
    to: number,
): Transaction | null => {
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || !canOpenCompose(state, from)) {
        return null;
    }

    const mark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: '',
        [CHARACTER_TAG_ID_ATTR]: null,
    });
    const tr = state.tr.replaceWith(from, to, state.schema.text(PLACEHOLDER_CHARACTER, [mark]));

    return tr
        .setSelection(TextSelection.create(tr.doc, from + 1))
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
    const tr = isPlaceholderText(text)
        ? state.tr.delete(range.from, range.to)
        : state.tr.removeMark(range.from, range.to, markType);

    return tr.setMeta(CLOSE_META_KEY, true);
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

    const rawName = (payload?.name ?? compose.query).trim();
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
