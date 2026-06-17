import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {getMarkRange} from '@tiptap/core';
import {TextSelection} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';

import type {PersistentCharacterRef} from '../../../contracts';
import {getCharacterTagComposeFromState} from './composeState';
import {
    CLOSE_META_KEY,
    OPEN_META_KEY,
    TRIGGER_CHARACTER,
} from './constants';
import {
    charAt,
    findTagRangeForEndTyping,
} from './markRanges';
import {
    isPlaceholderText,
    isTagSpaceText,
    normalizeCommittedTagName,
    normalizeTagTextSpaces,
    normalizeVisibleTagText,
    resolveDoubleSpaceCommitName,
    stripLeadingPlaceholder,
} from './text';
import {
    buildCommittedTagExitTransaction,
    buildCommitTransaction,
    buildOpenComposeTransaction,
    resolveConfirmedCharacterIdForName,
} from './transactions';

const isTrailingTagPunctuationInput = (text: string) => {
    return text.length === 1
        && text !== TRIGGER_CHARACTER
        && !(/[\p{L}\p{N}\s]/u).test(text);
};

const handleTrailingTagSpaceTextInput = (
    view: EditorView,
    from: number,
    to: number,
    text: string,
) => {
    const {state} = view;

    if (
        !state.selection.empty
        || from !== to
        || from <= 0
        || !isTrailingTagPunctuationInput(text)
    ) {
        return false;
    }

    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || charAt(state, from - 1) !== ' ') {
        return false;
    }

    const previousRange = getMarkRange(state.doc.resolve(from - 1), markType);

    if (!previousRange || previousRange.to !== from - 1) {
        return false;
    }

    const tr = state.tr.insertText(text, from - 1, from);

    tr.setSelection(TextSelection.create(tr.doc, from));
    view.dispatch(tr);

    return true;
};

const handleComposingTextInput = (
    view: EditorView,
    from: number,
    to: number,
    text: string,
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
) => {
    const compose = getCharacterTagComposeFromState(view.state);

    if (!compose) {
        return false;
    }

    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || !state.selection.empty || text.length === 0) {
        return false;
    }

    const markedText = state.doc.textBetween(compose.from, compose.to, '\n', '\n');
    const visibleComposeQuery = normalizeCommittedTagName(markedText);
    const commitName = isTagSpaceText(text)
        ? resolveDoubleSpaceCommitName(`${compose.query}${text}`)
        : null;

    if (commitName) {
        const tr = buildCommitTransaction(state, getPersistentCharacters(), {
            name: commitName,
            trailingSpace: true,
        });

        if (tr) {
            view.dispatch(tr);

            return true;
        }
    }

    if (text === ' ' && visibleComposeQuery.length === 0) {
        const tr = state.tr
            .insertText(' ', compose.from, compose.to)
            .setMeta(CLOSE_META_KEY, true);

        tr.setSelection(TextSelection.create(tr.doc, compose.from + 1));
        tr.removeStoredMark(markType);
        view.dispatch(tr);

        return true;
    }

    const isReplacingPlaceholder = compose.query.length === 0
        && isPlaceholderText(markedText);
    const replaceFrom = isReplacingPlaceholder ? compose.from : from;
    const replaceTo = isReplacingPlaceholder ? compose.to : to;
    const nextName = `${normalizeTagTextSpaces(compose.query)}${text}`;
    const nextTo = compose.from + nextName.length;
    const nextCharacterId = resolveConfirmedCharacterIdForName(nextName, getPersistentCharacters());
    const nextMark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(nextName),
        [CHARACTER_TAG_ID_ATTR]: nextCharacterId,
    });
    const tr = state.tr.replaceWith(replaceFrom, replaceTo, state.schema.text(text, [nextMark]));

    tr.removeMark(compose.from, nextTo, markType);
    tr.addMark(compose.from, nextTo, nextMark);
    tr.setMeta(OPEN_META_KEY, compose.from);
    tr.setSelection(TextSelection.create(tr.doc, nextTo));
    view.dispatch(tr);

    return true;
};

const handleCommittedTagTextInput = (
    view: EditorView,
    from: number,
    text: string,
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
) => {
    const {state} = view;

    if (!state.selection.empty || text.length !== 1) {
        return false;
    }

    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForEndTyping(state, markType) : null;

    if (!markType || !range || from !== range.replaceTo) {
        return false;
    }

    const markedText = state.doc.textBetween(range.from, range.replaceTo);
    const normalizedMarkedText = normalizeVisibleTagText(stripLeadingPlaceholder(markedText));
    const nextText = `${normalizeTagTextSpaces(normalizedMarkedText)}${text}`;
    const commitName = isTagSpaceText(text)
        ? resolveDoubleSpaceCommitName(nextText)
        : null;

    if (commitName) {
        const tr = buildCommittedTagExitTransaction(
            state,
            markType,
            range.from,
            range.replaceTo,
            commitName,
            resolveConfirmedCharacterIdForName(commitName, getPersistentCharacters()),
        );

        if (tr) {
            view.dispatch(tr);

            return true;
        }
    }

    const nextKey = normalizeCharacterKey(nextText);
    const nextCharacterId = resolveConfirmedCharacterIdForName(nextText, getPersistentCharacters());
    const nextTo = range.from + nextText.length;
    const tr = normalizedMarkedText === markedText && range.replaceTo === range.to
        ? state.tr.insertText(text, from, from)
        : state.tr.replaceWith(range.from, range.replaceTo, state.schema.text(nextText));

    tr.removeMark(range.from, nextTo, markType);
    tr.addMark(range.from, nextTo, markType.create({
        [CHARACTER_TAG_KEY_ATTR]: nextKey,
        [CHARACTER_TAG_ID_ATTR]: nextCharacterId,
    }));
    tr.setSelection(TextSelection.create(tr.doc, nextTo));
    view.dispatch(tr);

    return true;
};

export const createCharacterTagTextInputHandler = (
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
) => {
    return (view: EditorView, from: number, to: number, text: string) => {
        if (handleComposingTextInput(view, from, to, text, getPersistentCharacters)) {
            return true;
        }

        if (text === TRIGGER_CHARACTER) {
            const tr = buildOpenComposeTransaction(view.state, from, to);

            if (tr) {
                view.dispatch(tr);

                return true;
            }
        }

        if (handleTrailingTagSpaceTextInput(view, from, to, text)) {
            return true;
        }

        return handleCommittedTagTextInput(view, from, text, getPersistentCharacters);
    };
};
