import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
} from '@stagistic/script';
import {Extension} from '@tiptap/core';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';

import {
    splitBlockWithType,
    updateBlockType,
} from '../fountainBlock/commands';
import type {BlockNextElementMap} from '../fountainBlock/handlers/types';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    getNextTypeOnEnter,
    isSelectionAcrossBlocks,
    normalizeFountainBlockType,
} from '../fountainCore';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        emptyEnterChooser: {
            openEmptyEnterChooser: (payload: {
                blockId: string,
                blockPos: number,
                blockType: FountainBlockType,
                selectedType?: FountainBlockType,
            }) => ReturnType,
            closeEmptyEnterChooser: () => ReturnType,
            selectEmptyEnterChooserType: (type: FountainBlockType) => ReturnType,
            moveEmptyEnterChooserSelection: (direction: -1 | 1) => ReturnType,
            confirmEmptyEnterChooserType: (type?: FountainBlockType) => ReturnType,
            insertNextEmptyFromEmptyEnterChooser: () => ReturnType,
        },
    }
}

export interface EmptyEnterChooserState {
    isOpen: boolean,
    blockId: string | null,
    blockPos: number | null,
    blockType: FountainBlockType | null,
    selectedType: FountainBlockType | null,
    openedByEmptyEnter: boolean,
}

const CLOSED_EMPTY_ENTER_CHOOSER_STATE: EmptyEnterChooserState = {
    isOpen: false,
    blockId: null,
    blockPos: null,
    blockType: null,
    selectedType: null,
    openedByEmptyEnter: false,
};

export const EMPTY_ENTER_CHOOSER_WRITER_TYPES: readonly FountainBlockType[] = [
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_TRANSITION,
];

const EMPTY_ENTER_CHOOSER_WRITER_TYPE_SET = new Set(EMPTY_ENTER_CHOOSER_WRITER_TYPES);

const OPEN_META_KEY = 'empty-enter-chooser-open';
const CLOSE_META_KEY = 'empty-enter-chooser-close';
const SELECT_META_KEY = 'empty-enter-chooser-select';

interface OpenMetaPayload {
    blockId: string,
    blockPos: number,
    blockType: FountainBlockType,
    selectedType?: FountainBlockType,
}

const normalizeWriterType = (value: unknown): FountainBlockType => {
    const normalized = normalizeFountainBlockType(value);

    if (EMPTY_ENTER_CHOOSER_WRITER_TYPE_SET.has(normalized)) {
        return normalized;
    }

    return ELEMENT_ACTION;
};

const isCollapsedSingleBlockSelection = (state: EditorState) => {
    if (!state.selection.empty) {
        return false;
    }

    if (isSelectionAcrossBlocks(state, FOUNTAIN_BLOCK_NODE_NAME)) {
        return false;
    }

    return true;
};

const isBlockTextEmpty = (state: EditorState, blockPos: number | null) => {
    if (typeof blockPos !== 'number') {
        return false;
    }

    const nodeAtPos = state.doc.nodeAt(blockPos);

    if (!nodeAtPos) {
        return false;
    }

    return (nodeAtPos.textContent ?? '').trim().length === 0;
};

const createOpenStateFromPayload = (payload: OpenMetaPayload): EmptyEnterChooserState => {
    const normalizedBlockType = normalizeFountainBlockType(payload.blockType);
    const selectedType = normalizeWriterType(payload.selectedType ?? normalizedBlockType);

    return {
        isOpen: true,
        blockId: payload.blockId,
        blockPos: payload.blockPos,
        blockType: normalizedBlockType,
        selectedType,
        openedByEmptyEnter: true,
    };
};

export const isEmptyEnterChooserWriterType = (value: unknown): value is FountainBlockType => {
    const normalized = normalizeFountainBlockType(value);

    return EMPTY_ENTER_CHOOSER_WRITER_TYPE_SET.has(normalized);
};

export const emptyEnterChooserKey = new PluginKey<EmptyEnterChooserState>('empty-enter-chooser');

export const getEmptyEnterChooserFromState = (state: EditorState): EmptyEnterChooserState => {
    return emptyEnterChooserKey.getState(state) ?? CLOSED_EMPTY_ENTER_CHOOSER_STATE;
};

const resolveNextEmptyType = (
    selectedType: FountainBlockType,
    blockNextElements?: BlockNextElementMap,
) => {
    const configured = blockNextElements?.[selectedType];

    return configured ?? getNextTypeOnEnter(selectedType);
};

export const EmptyEnterChooserExtension = Extension.create<{
    blockNextElements?: BlockNextElementMap,
}>({
    name: 'EmptyEnterChooser',

    addOptions() {
        return {
            blockNextElements: undefined,
        };
    },

    addCommands() {
        const closeChooser = () => {
            const commands = this.editor.commands as {
                closeEmptyEnterChooser?: () => boolean,
            };

            if (this.editor.isDestroyed) {
                return;
            }

            commands.closeEmptyEnterChooser?.();
        };

        return {
            openEmptyEnterChooser: payload => ({state, dispatch}) => {
                if (!dispatch) {
                    return true;
                }

                dispatch(state.tr.setMeta(OPEN_META_KEY, payload));

                return true;
            },
            closeEmptyEnterChooser: () => ({state, dispatch}) => {
                if (!dispatch) {
                    return true;
                }

                dispatch(state.tr.setMeta(CLOSE_META_KEY, true));

                return true;
            },
            selectEmptyEnterChooserType: type => ({state, dispatch}) => {
                if (!dispatch) {
                    return true;
                }

                dispatch(state.tr.setMeta(SELECT_META_KEY, normalizeWriterType(type)));

                return true;
            },
            moveEmptyEnterChooserSelection: direction => ({state, dispatch}) => {
                if (!dispatch) {
                    return true;
                }

                const chooserState = getEmptyEnterChooserFromState(state);

                if (!chooserState.isOpen) {
                    return false;
                }

                const selectedType = normalizeWriterType(chooserState.selectedType ?? chooserState.blockType);
                const currentIndex = EMPTY_ENTER_CHOOSER_WRITER_TYPES.indexOf(selectedType);

                if (currentIndex < 0) {
                    return false;
                }

                const length = EMPTY_ENTER_CHOOSER_WRITER_TYPES.length;
                const nextIndex = (currentIndex + direction + length) % length;
                const nextType = EMPTY_ENTER_CHOOSER_WRITER_TYPES[nextIndex];

                dispatch(state.tr.setMeta(SELECT_META_KEY, nextType));

                return true;
            },
            confirmEmptyEnterChooserType: type => () => {
                const chooserState = getEmptyEnterChooserFromState(this.editor.state);

                if (!chooserState.isOpen || !chooserState.blockId) {
                    return false;
                }

                const selectedType = normalizeWriterType(type ?? chooserState.selectedType ?? chooserState.blockType);
                const activeBlock = getActiveFountainBlockFromState(this.editor.state, FOUNTAIN_BLOCK_NODE_NAME);

                if (!activeBlock || activeBlock.id !== chooserState.blockId) {
                    closeChooser();

                    return false;
                }

                if (activeBlock.blockType === selectedType) {
                    if (typeof type !== 'undefined') {
                        closeChooser();

                        return true;
                    }

                    const didInsert = splitBlockWithType(this.editor, selectedType);

                    closeChooser();

                    return didInsert;
                }

                const didUpdate = updateBlockType(this.editor, selectedType, chooserState.blockId);

                closeChooser();

                return didUpdate;
            },
            insertNextEmptyFromEmptyEnterChooser: () => () => {
                const chooserState = getEmptyEnterChooserFromState(this.editor.state);

                if (!chooserState.isOpen || !chooserState.blockId) {
                    return false;
                }

                const selectedType = normalizeWriterType(chooserState.selectedType ?? chooserState.blockType);
                const activeBlock = getActiveFountainBlockFromState(this.editor.state, FOUNTAIN_BLOCK_NODE_NAME);

                if (!activeBlock || activeBlock.id !== chooserState.blockId) {
                    closeChooser();

                    return false;
                }

                if (activeBlock.blockType !== selectedType) {
                    const didSetType = updateBlockType(this.editor, selectedType, chooserState.blockId);

                    if (!didSetType) {
                        closeChooser();

                        return false;
                    }
                }

                const nextType = resolveNextEmptyType(selectedType, this.options.blockNextElements);
                const didInsert = splitBlockWithType(this.editor, nextType);

                closeChooser();

                return didInsert;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin<EmptyEnterChooserState>({
                key: emptyEnterChooserKey,
                state: {
                    init: () => CLOSED_EMPTY_ENTER_CHOOSER_STATE,
                    apply: (tr, pluginState, _oldState, newState) => {
                        const closeMeta = tr.getMeta(CLOSE_META_KEY) === true;

                        if (closeMeta) {
                            return CLOSED_EMPTY_ENTER_CHOOSER_STATE;
                        }

                        const openMeta = tr.getMeta(OPEN_META_KEY) as OpenMetaPayload | undefined;

                        if (openMeta) {
                            return createOpenStateFromPayload(openMeta);
                        }

                        const selectMeta = tr.getMeta(SELECT_META_KEY) as unknown;
                        let nextState = pluginState;

                        if (selectMeta && pluginState.isOpen) {
                            nextState = {
                                ...pluginState,
                                selectedType: normalizeWriterType(selectMeta),
                            };
                        }

                        if (!nextState.isOpen) {
                            return nextState;
                        }

                        if (!isCollapsedSingleBlockSelection(newState)) {
                            return CLOSED_EMPTY_ENTER_CHOOSER_STATE;
                        }

                        const activeBlock = getActiveFountainBlockFromState(newState, FOUNTAIN_BLOCK_NODE_NAME);

                        if (!activeBlock || activeBlock.id !== nextState.blockId) {
                            return CLOSED_EMPTY_ENTER_CHOOSER_STATE;
                        }

                        if (!isBlockTextEmpty(newState, activeBlock.pos)) {
                            return CLOSED_EMPTY_ENTER_CHOOSER_STATE;
                        }

                        const normalizedBlockType = normalizeFountainBlockType(activeBlock.blockType);
                        const selectedType = normalizeWriterType(nextState.selectedType ?? normalizedBlockType);

                        if (
                            nextState.blockPos === activeBlock.pos
                            && nextState.blockType === normalizedBlockType
                            && nextState.selectedType === selectedType
                        ) {
                            return nextState;
                        }

                        return {
                            ...nextState,
                            blockPos: activeBlock.pos,
                            blockType: normalizedBlockType,
                            selectedType,
                        };
                    },
                },
            }),
        ];
    },
});
