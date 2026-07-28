import {CHARACTER_TAG_MARK_NAME} from '@stagistic/script';
import {getMarkRange} from '@tiptap/core';
import {Plugin} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    characterTagComposeKey,
    detectCompose,
    getCharacterTagComposeFromState,
    isComposeValid,
} from './composeState';
import {CLOSE_META_KEY, OPEN_META_KEY} from './constants';
import {createCharacterTagKeyDownHandler} from './keyDownHandlers';
import {
    findCommittedTagBeforeCursor,
    readCommittedTagCharacterId,
} from './markRanges';
import {resolveDoubleSpaceCommitName} from './text';
import {createCharacterTagTextInputHandler} from './textInputHandlers';
import {
    buildAbandonComposeTransaction,
    buildCommittedTagExitTransaction,
    buildCommitTransaction,
    buildEditCommittedTagTransaction,
    buildTrailingTagSpaceCleanupTransaction,
} from './transactions';
import type {
    CharacterTagComposeRawState,
    CharacterTagInputExtensionOptions,
} from './types';

export const createCharacterTagComposePlugin = (
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

                const openedFrom: unknown = tr.getMeta(OPEN_META_KEY);

                if (typeof openedFrom === 'number') {
                    return {from: tr.mapping.map(openedFrom, -1)};
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

            if (compose && compose.query.trim().length > 0) {
                const name = resolveDoubleSpaceCommitName(compose.query);

                if (name) {
                    return buildCommitTransaction(newState, getPersistentCharacters(), {
                        name,
                        trailingSpace: true,
                    });
                }
            }

            const committedMarkType = newState.schema.marks[CHARACTER_TAG_MARK_NAME];

            if (committedMarkType && newState.selection.empty && !compose) {
                const oldRange = oldState.selection.empty
                    ? getMarkRange(oldState.selection.$from, committedMarkType)
                    : undefined;
                const range = oldRange ? findCommittedTagBeforeCursor(newState, committedMarkType) : null;

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

            if (transactions.some(transaction => transaction.getMeta(CLOSE_META_KEY) === true)) {
                return null;
            }

            const previous = characterTagComposeKey.getState(oldState);

            if (!previous) {
                return buildTrailingTagSpaceCleanupTransaction(oldState, newState);
            }

            if (characterTagComposeKey.getState(newState)) {
                return null;
            }

            let from = previous.from;

            transactions.forEach(transaction => {
                from = transaction.mapping.map(from, -1);
            });

            return buildAbandonComposeTransaction(newState, from);
        },
        props: {
            handleClick: (view, pos) => {
                const tr = buildEditCommittedTagTransaction(view.state, pos);

                if (!tr) {
                    return false;
                }

                view.dispatch(tr);

                return true;
            },
            handleDOMEvents: {
                blur: view => {
                    const compose = getCharacterTagComposeFromState(view.state);

                    if (!compose) {
                        return false;
                    }

                    const tr = buildAbandonComposeTransaction(view.state, compose.from);

                    if (tr) {
                        view.dispatch(tr);
                    }

                    return false;
                },
            },
            handleTextInput: createCharacterTagTextInputHandler(getPersistentCharacters),
            handleKeyDown: createCharacterTagKeyDownHandler(editor, getPersistentCharacters),
        },
    });
};
