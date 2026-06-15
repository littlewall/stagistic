/*
 * CharacterTagInputExtension — the `@`-triggered authoring lifecycle for
 * inline character tags inside `stage_direction` blocks.
 *
 * Mechanism (suggestion-style ProseMirror plugin):
 *   - Typing `@` in a stage direction is intercepted and *suppressed* — the
 *     `@` is never inserted into the document (spec §5: the `@` is never shown
 *     as a literal character). Instead the plugin records a sentinel-free
 *     compose region anchored at the cursor.
 *   - While composing, the typed letters are plain prose decorated as a
 *     forming (unconfirmed) pill; the character-suggestions overlay reads the
 *     compose state and offers confirmed cast only.
 *   - On a terminator (overlay select / Enter / Tab / double space) the region
 *     is replaced by a `characterTag`-marked text node. `inclusive: false` on
 *     the mark means following typing is plain prose.
 *   - Because nothing is inserted on `@`, "type `@` then nothing then move
 *     away" needs no cleanup, and backspacing a committed tag to empty drops
 *     the (now empty) text node and its mark automatically.
 */
import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
    TextSelection,
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

const ACTIVATE_META_KEY = 'character-tag-compose-activate';
const CLOSE_META_KEY = 'character-tag-compose-close';

interface CharacterTagComposeRawState {
    /** Document position where composing started (no sentinel char is stored). */
    from: number,
}

export interface CharacterTagComposeState {
    from: number,
    to: number,
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

    if (to < from) {
        return null;
    }

    const query = state.doc.textBetween(from, to, '\n', '\n');

    return {
        from, to, query,
    };
};

const isStageDirectionSelection = (state: EditorState): boolean => {
    const block = getActiveScriptBlockFromState(state);

    return Boolean(block && block.blockType === STAGE_DIRECTION_BLOCK_TYPE);
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

const createCharacterTagComposePlugin = (
    editor: TiptapEditor,
    tagClassName: string,
): Plugin<CharacterTagComposeRawState | null> => {
    return new Plugin<CharacterTagComposeRawState | null>({
        key: characterTagComposeKey,
        state: {
            init: () => null,
            apply: (tr, value, _oldState, newState) => {
                if (tr.getMeta(CLOSE_META_KEY) === true) {
                    return null;
                }

                const activateMeta = tr.getMeta(ACTIVATE_META_KEY) as CharacterTagComposeRawState | undefined;

                if (activateMeta) {
                    return {from: activateMeta.from};
                }

                if (!value) {
                    return null;
                }

                const from = tr.mapping.map(value.from, -1);
                const {selection} = newState;

                if (!selection.empty || selection.from < from) {
                    return null;
                }

                const block = getActiveScriptBlockFromState(newState);

                if (
                    !block
                    || block.blockType !== STAGE_DIRECTION_BLOCK_TYPE
                    || from < block.from
                    || selection.from > block.to
                ) {
                    return null;
                }

                return from === value.from ? value : {from};
            },
        },
        props: {
            handleTextInput: (view, from, _to, text) => {
                if (text !== '@') {
                    return false;
                }

                const {state} = view;

                if (!state.selection.empty || !isStageDirectionSelection(state)) {
                    return false;
                }

                if (characterTagComposeKey.getState(state)) {
                    return false;
                }

                const block = getActiveScriptBlockFromState(state);

                if (!block) {
                    return false;
                }

                const charBefore = from > block.from ? state.doc.textBetween(from - 1, from) : '';

                if (charBefore.length > 0 && !(/\s/).test(charBefore)) {
                    return false;
                }

                view.dispatch(state.tr.setMeta(ACTIVATE_META_KEY, {from}));

                return true;
            },
            handleKeyDown: (view, event) => {
                const compose = getCharacterTagComposeFromState(view.state);

                if (!compose) {
                    return false;
                }

                if (event.key === 'Escape') {
                    view.dispatch(view.state.tr.setMeta(CLOSE_META_KEY, true));

                    return true;
                }

                if (event.key === 'Enter' || event.key === 'Tab') {
                    if (compose.query.trim().length === 0) {
                        view.dispatch(view.state.tr.setMeta(CLOSE_META_KEY, true));

                        return false;
                    }

                    editor.commands.commitCharacterTag();

                    return true;
                }

                if (event.key === ' ') {
                    if (compose.query.trim().length > 0 && compose.query.endsWith(' ')) {
                        editor.commands.commitCharacterTag({trailingSpace: true});
                        event.preventDefault();

                        return true;
                    }

                    return false;
                }

                return false;
            },
            decorations: state => {
                const compose = getCharacterTagComposeFromState(state);

                if (!compose || compose.to <= compose.from) {
                    return null;
                }

                return DecorationSet.create(state.doc, [Decoration.inline(compose.from, compose.to, {class: tagClassName})]);
            },
        },
    });
};

export const CharacterTagInputExtension = Extension.create<CharacterTagInputExtensionOptions>({
    name: 'CharacterTagInput',
    /*
     * Run before block-behaviour extensions so Tab/Enter/space terminators are
     * handled while composing instead of triggering block navigation.
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
                const compose = getCharacterTagComposeFromState(state);

                if (!compose) {
                    return false;
                }

                const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

                if (!markType) {
                    return false;
                }

                const rawName = (payload?.name ?? compose.query).trim();
                const key = normalizeCharacterKey(rawName);

                if (rawName.length === 0 || key.length === 0) {
                    if (dispatch) {
                        dispatch(state.tr.setMeta(CLOSE_META_KEY, true));
                    }

                    return true;
                }

                if (!dispatch) {
                    return true;
                }

                const characterId = resolveConfirmedCharacterId(
                    key,
                    this.options.persistentCharactersRef?.current ?? [],
                );
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

                tr = tr
                    .setSelection(TextSelection.create(tr.doc, caret))
                    .removeStoredMark(markType)
                    .setMeta(CLOSE_META_KEY, true);

                dispatch(tr.scrollIntoView());

                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        return [createCharacterTagComposePlugin(this.editor, this.options.tagClassName)];
    },
});
