/*
 * CharacterTagInputExtension — the `@`-triggered authoring lifecycle for
 * inline character tags inside `stage_direction` blocks.
 *
 * Mechanism (suggestion-style ProseMirror plugin):
 *   - Typing `@` at a word boundary in a stage direction starts composing. The
 *     `@` stays in the document as the compose anchor and renders as a forming
 *     (unconfirmed) pill via an inline decoration. The `@` is a transient
 *     authoring sentinel only — it is stripped on commit, so a *committed* tag
 *     never shows it (spec §5).
 *   - While composing, the typed letters extend the pill and the
 *     character-suggestions overlay (read from this plugin's state) offers
 *     confirmed cast only.
 *   - Commit (overlay select / Enter / Tab / double space) replaces the
 *     `@`+query region with a `characterTag`-marked text node; `inclusive:
 *     false` on the mark keeps following typing as plain prose. Double space is
 *     detected in `appendTransaction` (on the resulting doc state) rather than
 *     on keydown, which races the DOM input event.
 *   - Abandoning a compose (moving away, Escape, Enter/Tab on an empty `@`)
 *     strips the stray `@` so no literal `@` is ever left behind.
 */
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {
    Extension,
    getMarkRange,
} from '@tiptap/core';
import type {MarkType} from '@tiptap/pm/model';
import {
    type EditorState,
    Plugin,
    PluginKey,
    TextSelection,
    type Transaction,
} from '@tiptap/pm/state';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';
import type {Editor as TiptapEditor} from '@tiptap/react';

import type {PersistentCharacterRef} from '../../contracts';
import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
} from '../scriptCore';

const STAGE_DIRECTION_BLOCK_TYPE: BlockNodeType = 'stageDirection';

const CLOSE_META_KEY = 'character-tag-compose-close';
const TRIGGER_CHARACTER = '@';

interface CharacterTagComposeRawState {
    /** Document position of the `@` compose anchor. */
    from: number,
}

export interface CharacterTagComposeState {
    /** Position of the `@` anchor. */
    from: number,
    /** Current cursor position (end of the compose region). */
    to: number,
    /** Text typed after the `@` (excludes the `@`). */
    query: string,
}

interface CommitCharacterTagPayload {
    /** Explicit name to commit (e.g. a chosen overlay suggestion). */
    name?: string,
    /** When true, insert a normal space after the committed pill. */
    trailingSpace?: boolean,
}

export interface CharacterTagInputExtensionOptions {
    tagClassName: string,
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        characterTagInput: {
            commitCharacterTag: (payload?: CommitCharacterTagPayload) => ReturnType,
        },
    }
}

export const characterTagComposeKey = new PluginKey<CharacterTagComposeRawState | null>('character-tag-compose');

const charAt = (state: EditorState, pos: number): string => {
    if (pos < 0 || pos + 1 > state.doc.content.size) {
        return '';
    }

    return state.doc.textBetween(pos, pos + 1, '\n', '\n');
};

/**
 * Reads the live compose region from editor state, deriving the query from the
 * current (collapsed) selection. Returns null when not composing.
 */
export const getCharacterTagComposeFromState = (state: EditorState): CharacterTagComposeState | null => {
    const raw = characterTagComposeKey.getState(state);

    if (!raw) {
        return null;
    }

    const {selection} = state;

    if (!selection.empty) {
        return null;
    }

    const {from} = raw;
    const to = selection.from;

    if (to <= from) {
        return null;
    }

    const query = state.doc.textBetween(from + 1, to, '\n', '\n');

    return {
        from, to, query,
    };
};

const isComposeValid = (state: EditorState, from: number): boolean => {
    if (charAt(state, from) !== TRIGGER_CHARACTER) {
        return false;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.blockType !== STAGE_DIRECTION_BLOCK_TYPE || from < block.from) {
        return false;
    }

    const {selection} = state;

    return selection.empty && selection.from > from && selection.from <= block.to;
};

/** Detects a freshly typed `@` sitting just before the cursor at a word boundary. */
const detectCompose = (state: EditorState): CharacterTagComposeRawState | null => {
    const {selection} = state;

    if (!selection.empty) {
        return null;
    }

    const block = getActiveScriptBlockFromState(state);

    if (!block || block.blockType !== STAGE_DIRECTION_BLOCK_TYPE) {
        return null;
    }

    const from = selection.from - 1;

    if (from < block.from || charAt(state, from) !== TRIGGER_CHARACTER) {
        return null;
    }

    const charBefore = from > block.from ? charAt(state, from - 1) : '';

    if (charBefore.length > 0 && !(/\s/).test(charBefore)) {
        return null;
    }

    return {from};
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

/**
 * Returns the name to commit when the compose query was ended by a double
 * space, or null otherwise. Handles a raw double space (`"  "`, when smart
 * substitution is off) and the macOS "double-space → '. '" substitution
 * (a trailing `". "`).
 */
const resolveDoubleSpaceCommitName = (query: string): string | null => {
    if (query.endsWith('  ')) {
        return query.trim() || null;
    }

    if ((/\S\.\s$/).test(query)) {
        return query.replace(/\.\s$/, '').trim() || null;
    }

    return null;
};

const readCommittedTagCharacterId = (
    state: EditorState,
    from: number,
    to: number,
    markType: MarkType,
): string | null => {
    let characterId: string | null = null;

    state.doc.nodesBetween(from, to, child => {
        const mark = child.marks.find(candidate => candidate.type === markType);

        if (mark) {
            const rawId: unknown = mark.attrs[CHARACTER_TAG_ID_ATTR];

            characterId = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;
        }
    });

    return characterId;
};

/**
 * Finds a `characterTag` mark range ending at (or just before) the cursor.
 * Probes a few positions back so it still finds the mark when a double space
 * (or the macOS "→ '. '" substitution) left a couple of prose chars after it.
 */
const findCommittedTagBeforeCursor = (
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

/**
 * Re-marks [from, to] as a finished tag named `name` and drops a normal space
 * after it, leaving the cursor in plain prose. This is how editing a committed
 * tag "exits" it (double space / Enter / Tab).
 */
const buildCommittedTagExitTransaction = (
    state: EditorState,
    markType: MarkType,
    from: number,
    to: number,
    name: string,
    characterId: string | null,
): Transaction | null => {
    const key = normalizeCharacterKey(name);

    if (key.length === 0) {
        return null;
    }

    const node = state.schema.text(name, [
        markType.create({
            [CHARACTER_TAG_KEY_ATTR]: key,
            [CHARACTER_TAG_ID_ATTR]: characterId,
        }),
    ]);
    const tr = state.tr.replaceWith(from, to, node);
    const caret = from + name.length;

    return tr
        .insertText(' ', caret)
        .setSelection(TextSelection.create(tr.doc, caret + 1))
        .removeStoredMark(markType);
};

/**
 * Builds the transaction that commits the active compose region to a
 * `characterTag` mark (or strips a stray `@` when there is nothing to commit).
 * Returns null when not composing.
 */
const buildCommitTransaction = (
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
    const mark = markType.create({
        [CHARACTER_TAG_KEY_ATTR]: key,
        [CHARACTER_TAG_ID_ATTR]: characterId,
    });
    const textNode = state.schema.text(rawName, [mark]);
    let tr = state.tr.replaceWith(compose.from, compose.to, textNode);
    let caret = compose.from + rawName.length;

    if (payload?.trailingSpace) {
        tr = tr.insertText(' ', caret);
        caret += 1;
    }

    return tr
        .setSelection(TextSelection.create(tr.doc, caret))
        .removeStoredMark(markType)
        .setMeta(CLOSE_META_KEY, true)
        .scrollIntoView();
};

const createCharacterTagComposePlugin = (
    editor: TiptapEditor,
    options: CharacterTagInputExtensionOptions,
): Plugin<CharacterTagComposeRawState | null> => {
    const getPersistentCharacters = () => options.persistentCharactersRef?.current ?? [];

    return new Plugin<CharacterTagComposeRawState | null>({
        key: characterTagComposeKey,
        state: {
            init: () => null,
            apply: (tr, value, _oldState, newState) => {
                if (tr.getMeta(CLOSE_META_KEY) === true) {
                    return null;
                }

                if (value) {
                    const from = tr.mapping.map(value.from, -1);

                    if (isComposeValid(newState, from)) {
                        return from === value.from ? value : {from};
                    }
                }

                return detectCompose(newState);
            },
        },
        appendTransaction: (transactions, oldState, newState) => {
            const compose = getCharacterTagComposeFromState(newState);

            /*
             * Double space commits the tag. Detected on the resulting doc state
             * (not on keydown, which races the DOM input event) so it survives
             * the macOS "double-space → '. '" substitution, which turns the two
             * spaces into a period + space before they reach the document.
             */
            if (compose && compose.query.trim().length > 0) {
                const name = resolveDoubleSpaceCommitName(compose.query);

                if (name) {
                    return buildCommitTransaction(newState, getPersistentCharacters(), {
                        name,
                        trailingSpace: true,
                    });
                }
            }

            /*
             * Double space while editing an already-committed tag exits the
             * pill. Caught here (not only in handleTextInput) so it survives the
             * macOS "double-space → '. '" substitution.
             */
            const committedMarkType = newState.schema.marks[CHARACTER_TAG_MARK_NAME];

            if (committedMarkType && newState.selection.empty && !compose) {
                const range = findCommittedTagBeforeCursor(newState, committedMarkType);

                if (range) {
                    const region = newState.doc.textBetween(range.from, newState.selection.from);
                    const name = resolveDoubleSpaceCommitName(region);

                    if (name) {
                        const characterId = readCommittedTagCharacterId(
                            newState,
                            range.from,
                            range.to,
                            committedMarkType,
                        );
                        const exitTr = buildCommittedTagExitTransaction(
                            newState,
                            committedMarkType,
                            range.from,
                            newState.selection.from,
                            name,
                            characterId,
                        );

                        if (exitTr) {
                            return exitTr;
                        }
                    }
                }
            }

            /*
             * Compose just ended without a commit — strip the stray `@`, keeping
             * any typed letters as plain prose.
             */
            const previous = characterTagComposeKey.getState(oldState);

            if (!previous || characterTagComposeKey.getState(newState)) {
                return null;
            }

            let from = previous.from;

            transactions.forEach(transaction => {
                from = transaction.mapping.map(from, -1);
            });

            if (charAt(newState, from) !== TRIGGER_CHARACTER) {
                return null;
            }

            return newState.tr.delete(from, from + 1);
        },
        props: {
            handleTextInput: (view, from, _to, text) => {
                /*
                 * Typing at the END of a committed tag extends the name (stays in
                 * the pill) — letters AND single spaces (multi-word names). A
                 * double space exits the pill into plain prose; that, Enter and
                 * Tab are the only ways out.
                 */
                if (getCharacterTagComposeFromState(view.state)) {
                    return false;
                }

                const {state} = view;

                if (!state.selection.empty || text.length !== 1) {
                    return false;
                }

                const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
                const range = markType ? getMarkRange(state.selection.$from, markType) : undefined;

                if (!markType || !range || from !== range.to) {
                    return false;
                }

                const characterId = readCommittedTagCharacterId(state, range.from, range.to, markType);
                const markedText = state.doc.textBetween(range.from, range.to);

                /*
                 * Extend only — letters AND single spaces grow the name in the
                 * pill. Exiting (double space, including the macOS "→ '. '"
                 * substitution) is detected deterministically in
                 * appendTransaction on the resulting state, not here, where
                 * input timing and DOM-selection sync are unreliable.
                 */
                const nextKey = normalizeCharacterKey(markedText + text);
                const nextTo = range.to + text.length;
                const tr = state.tr.insertText(text, from, from);

                tr.removeMark(range.from, nextTo, markType);
                tr.addMark(range.from, nextTo, markType.create({
                    [CHARACTER_TAG_KEY_ATTR]: nextKey,
                    [CHARACTER_TAG_ID_ATTR]: characterId,
                }));
                tr.setSelection(TextSelection.create(tr.doc, nextTo));
                view.dispatch(tr);

                return true;
            },
            handleKeyDown: (view, event) => {
                const compose = getCharacterTagComposeFromState(view.state);

                if (!compose) {
                    /*
                     * Not composing: Enter/Tab inside a committed tag would split
                     * it across blocks. Exit to the end of the pill instead.
                     */
                    if (event.key === 'Enter' || event.key === 'Tab') {
                        const {state} = view;
                        const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];
                        const range = markType
                            ? getMarkRange(state.selection.$from, markType)
                            : undefined;

                        if (range && state.selection.from > range.from && state.selection.from < range.to) {
                            view.dispatch(state.tr
                                .setSelection(TextSelection.create(state.doc, range.to))
                                .scrollIntoView());

                            return true;
                        }
                    }

                    return false;
                }

                if (event.key === 'Escape') {
                    view.dispatch(view.state.tr
                        .delete(compose.from, compose.from + 1)
                        .setMeta(CLOSE_META_KEY, true));

                    return true;
                }

                if (event.key === 'Enter' || event.key === 'Tab') {
                    if (compose.query.trim().length === 0) {
                        // Empty `@`: cancel the pill, consume the key (no newline).
                        view.dispatch(view.state.tr
                            .delete(compose.from, compose.from + 1)
                            .setMeta(CLOSE_META_KEY, true));

                        return true;
                    }

                    editor.commands.commitCharacterTag();

                    return true;
                }

                /*
                 * Double space (incl. macOS "→ '. '") is committed from
                 * appendTransaction, which sees the resulting doc state.
                 */
                return false;
            },
            decorations: state => {
                const compose = getCharacterTagComposeFromState(state);

                if (!compose) {
                    return null;
                }

                return DecorationSet.create(state.doc, [Decoration.inline(compose.from, compose.to, {class: options.tagClassName})]);
            },
        },
    });
};

export const CharacterTagInputExtension = Extension.create<CharacterTagInputExtensionOptions>({
    name: 'CharacterTagInput',
    /*
     * Run before block-behaviour extensions so Enter/Tab terminators are handled
     * while composing instead of triggering block navigation.
     */
    priority: 1000,

    addOptions() {
        return {
            tagClassName: 'characterTag',
            persistentCharactersRef: undefined,
        };
    },

    addCommands() {
        return {
            commitCharacterTag: payload => ({state, dispatch}) => {
                const tr = buildCommitTransaction(
                    state,
                    this.options.persistentCharactersRef?.current ?? [],
                    payload,
                );

                if (!tr) {
                    return false;
                }

                if (dispatch) {
                    dispatch(tr);
                }

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [createCharacterTagComposePlugin(this.editor, this.options)];
    },
});
