import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';
import type {Editor as TiptapEditor} from '@tiptap/react';

import type {PersistentCharacterRef} from '../../../contracts';
import {getCharacterTagComposeFromState} from './composeState';
import {CLOSE_META_KEY} from './constants';
import {
    findProtectedTagSeparator,
    findTagRangeForConfirm,
    findTagRangeForEndTyping,
} from './markRanges';
import {
    normalizeCommittedTagName,
    normalizeTagTextSpaces,
    normalizeVisibleTagText,
    renderPendingTagText,
    resolveDoubleSpaceCommitName,
    stripLeadingPlaceholder,
} from './text';
import {
    buildCommittedTagExitTransaction,
    resolveConfirmedCharacterIdForName,
} from './transactions';

const handleBackspaceOutsideCompose = (
    view: EditorView,
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
) => {
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

    const nextMark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(nextText),
        [CHARACTER_TAG_ID_ATTR]: resolveConfirmedCharacterIdForName(nextText, getPersistentCharacters()),
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

const handleBackspaceProtectedTagSeparator = (view: EditorView) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || !state.selection.empty) {
        return false;
    }

    return findProtectedTagSeparator(state, markType, state.selection.from - 1) !== null;
};

const handleDeleteProtectedTagSeparator = (view: EditorView) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType || !state.selection.empty) {
        return false;
    }

    return findProtectedTagSeparator(state, markType, state.selection.from) !== null;
};

const handleSpaceOutsideCompose = (
    view: EditorView,
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForEndTyping(state, markType) : null;

    if (!markType || !range || state.selection.from !== range.replaceTo) {
        return false;
    }

    const markedText = state.doc.textBetween(range.from, range.replaceTo);
    const normalizedMarkedText = normalizeVisibleTagText(stripLeadingPlaceholder(markedText));

    if (normalizedMarkedText.length === 0) {
        const tr = state.tr.insertText(' ', range.from, range.replaceTo);

        tr.setSelection(TextSelection.create(tr.doc, range.from + 1));
        tr.removeStoredMark(markType);
        view.dispatch(tr.setMeta(CLOSE_META_KEY, true));

        return true;
    }

    const nextText = renderPendingTagText(`${normalizeTagTextSpaces(normalizedMarkedText)} `);
    const commitName = resolveDoubleSpaceCommitName(nextText);

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

    const nextMark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: normalizeCharacterKey(nextText),
        [CHARACTER_TAG_ID_ATTR]: resolveConfirmedCharacterIdForName(
            normalizeCommittedTagName(nextText),
            getPersistentCharacters(),
        ),
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

const handleConfirmOutsideCompose = (
    view: EditorView,
    getPersistentCharacters: () => readonly PersistentCharacterRef[],
) => {
    const {state} = view;
    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
    const range = markType ? findTagRangeForConfirm(state, markType) : null;

    if (!markType || !range) {
        return false;
    }

    const name = normalizeCommittedTagName(state.doc.textBetween(range.from, range.to));

    if (name.length === 0) {
        view.dispatch(state.tr
            .delete(range.from, range.to)
            .setMeta(CLOSE_META_KEY, true)
            .scrollIntoView());

        return true;
    }

    const tr = buildCommittedTagExitTransaction(
        state,
        markType,
        range.from,
        range.to,
        name,
        resolveConfirmedCharacterIdForName(name, getPersistentCharacters()),
    );

    if (!tr) {
        return false;
    }

    view.dispatch(tr.scrollIntoView());

    return true;
};

export const createCharacterTagKeyDownHandler = (
    editor: TiptapEditor,
    getPersistentCharacters: () => readonly PersistentCharacterRef[] = () => [],
) => {
    return (view: EditorView, event: KeyboardEvent) => {
        const compose = getCharacterTagComposeFromState(view.state);

        if (!compose) {
            if (event.key === 'Backspace') {
                if (handleBackspaceProtectedTagSeparator(view)) {
                    return true;
                }

                return handleBackspaceOutsideCompose(view, getPersistentCharacters);
            }

            if (event.key === 'Delete') {
                return handleDeleteProtectedTagSeparator(view);
            }

            if (event.key === ' ') {
                return handleSpaceOutsideCompose(view, getPersistentCharacters);
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
                return handleConfirmOutsideCompose(view, getPersistentCharacters);
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
            if (normalizeCommittedTagName(compose.query).length === 0) {
                view.dispatch(view.state.tr
                    .delete(compose.from, compose.to)
                    .setMeta(CLOSE_META_KEY, true));

                return true;
            }

            editor.commands.commitCharacterTag({trailingSpace: true});

            return true;
        }

        return false;
    };
};
