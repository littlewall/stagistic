import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';

import type {PersistentCharacterRef} from '../../../contracts';
import {getCharacterTagComposeFromState} from './composeState';
import {TRIGGER_CHARACTER} from './constants';
import {
    findTagRangeForEndTyping,
    readCommittedTagCharacterId,
} from './markRanges';
import {
    isPlaceholderText,
    isTagSpaceText,
    normalizeTagTextSpaces,
    resolveDoubleSpaceCommitName,
    stripLeadingPlaceholder,
} from './text';
import {
    buildCommittedTagExitTransaction,
    buildCommitTransaction,
    buildOpenComposeTransaction,
} from './transactions';

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

    const characterId = readCommittedTagCharacterId(state, compose.from, compose.to, markType);
    const markedText = state.doc.textBetween(compose.from, compose.to, '\n', '\n');
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

    const isReplacingPlaceholder = compose.query.length === 0
        && isPlaceholderText(markedText);
    const replaceFrom = isReplacingPlaceholder ? compose.from : from;
    const replaceTo = isReplacingPlaceholder ? compose.to : to;
    const nextName = `${normalizeTagTextSpaces(compose.query)}${text}`;
    const nextTo = compose.from + nextName.length;
    const nextMark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(nextName),
        [CHARACTER_TAG_ID_ATTR]: characterId,
    });
    const tr = state.tr.replaceWith(replaceFrom, replaceTo, state.schema.text(text, [nextMark]));

    tr.removeMark(compose.from, nextTo, markType);
    tr.addMark(compose.from, nextTo, nextMark);
    tr.setSelection(TextSelection.create(tr.doc, nextTo));
    view.dispatch(tr);

    return true;
};

const handleCommittedTagTextInput = (
    view: EditorView,
    from: number,
    text: string,
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

    const characterId = readCommittedTagCharacterId(state, range.from, range.to, markType);
    const markedText = state.doc.textBetween(range.from, range.replaceTo);
    const normalizedMarkedText = stripLeadingPlaceholder(markedText);
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
            characterId,
        );

        if (tr) {
            view.dispatch(tr);

            return true;
        }
    }

    const nextKey = normalizeCharacterKey(nextText);
    const nextTo = range.from + nextText.length;
    const tr = normalizedMarkedText === markedText && range.replaceTo === range.to
        ? state.tr.insertText(text, from, from)
        : state.tr.replaceWith(range.from, range.replaceTo, state.schema.text(nextText));

    tr.removeMark(range.from, nextTo, markType);
    tr.addMark(range.from, nextTo, markType.create({
        [CHARACTER_TAG_KEY_ATTR]: nextKey,
        [CHARACTER_TAG_ID_ATTR]: characterId,
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

        return handleCommittedTagTextInput(view, from, text);
    };
};
