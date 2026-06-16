import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {getCharacterTagComposeFromState} from './composeState';
import {CLOSE_META_KEY} from './constants';
import {
    findTagRangeForConfirm,
    findTagRangeForEndTyping,
    readCommittedTagCharacterId,
} from './markRanges';
import {
    normalizeTagTextSpaces,
    renderPendingTagText,
    resolveDoubleSpaceCommitName,
    stripLeadingPlaceholder,
} from './text';
import {buildCommittedTagExitTransaction} from './transactions';

const handleBackspaceOutsideCompose = (view: EditorView) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForEndTyping(state, markType) : null;

    if (!markType || !range || state.selection.from !== range.replaceTo) {
        return false;
    }

    const markedText = state.doc.textBetween(range.from, range.replaceTo);
    const normalizedMarkedText = normalizeTagTextSpaces(stripLeadingPlaceholder(markedText));

    if (normalizedMarkedText.length === 0) {
        return false;
    }

    const nextText = renderPendingTagText(normalizedMarkedText.slice(0, -1));

    if (nextText.length === 0) {
        view.dispatch(state.tr.delete(range.from, range.replaceTo));

        return true;
    }

    const characterId = readCommittedTagCharacterId(state, range.from, range.to, markType);
    const nextMark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(nextText),
        [CHARACTER_TAG_ID_ATTR]: characterId,
    });
    const nextTo = range.from + nextText.length;
    const tr = state.tr.replaceWith(
        range.from,
        range.replaceTo,
        state.schema.text(nextText, [nextMark]),
    );

    tr.setSelection(TextSelection.create(tr.doc, nextTo));
    tr.addStoredMark(nextMark);
    view.dispatch(tr);

    return true;
};

const handleSpaceOutsideCompose = (view: EditorView) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForEndTyping(state, markType) : null;

    if (!markType || !range || state.selection.from !== range.replaceTo) {
        return false;
    }

    const characterId = readCommittedTagCharacterId(state, range.from, range.to, markType);
    const markedText = state.doc.textBetween(range.from, range.replaceTo);
    const normalizedMarkedText = stripLeadingPlaceholder(markedText);
    const nextText = renderPendingTagText(`${normalizeTagTextSpaces(normalizedMarkedText)} `);
    const commitName = resolveDoubleSpaceCommitName(nextText);

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

    const nextMark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(nextText),
        [CHARACTER_TAG_ID_ATTR]: characterId,
    });
    const nextTo = range.from + nextText.length;
    const tr = state.tr.replaceWith(
        range.from,
        range.replaceTo,
        state.schema.text(nextText, [nextMark]),
    );

    tr.setSelection(TextSelection.create(tr.doc, nextTo));
    tr.addStoredMark(nextMark);

    view.dispatch(tr);

    return true;
};

const handleConfirmOutsideCompose = (view: EditorView) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForConfirm(state, markType) : null;

    if (!markType || !range) {
        return false;
    }

    const characterId = readCommittedTagCharacterId(state, range.from, range.to, markType);
    const name = normalizeTagTextSpaces(state.doc.textBetween(range.from, range.to)).trim();
    const tr = buildCommittedTagExitTransaction(
        state,
        markType,
        range.from,
        range.to,
        name,
        characterId,
    );

    if (!tr) {
        return false;
    }

    view.dispatch(tr.scrollIntoView());

    return true;
};

export const createCharacterTagKeyDownHandler = (editor: TiptapEditor) => {
    return (view: EditorView, event: KeyboardEvent) => {
        const compose = getCharacterTagComposeFromState(view.state);

        if (!compose) {
            if (event.key === 'Backspace') {
                return handleBackspaceOutsideCompose(view);
            }

            if (event.key === ' ') {
                return handleSpaceOutsideCompose(view);
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
                return handleConfirmOutsideCompose(view);
            }

            return false;
        }

        if (event.key === 'Escape') {
            view.dispatch(view.state.tr
                .delete(compose.from, compose.to)
                .setMeta(CLOSE_META_KEY, true));

            return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
            if (compose.query.trim().length === 0) {
                view.dispatch(view.state.tr
                    .delete(compose.from, compose.to)
                    .setMeta(CLOSE_META_KEY, true));

                return true;
            }

            editor.commands.commitCharacterTag();

            return true;
        }

        return false;
    };
};
