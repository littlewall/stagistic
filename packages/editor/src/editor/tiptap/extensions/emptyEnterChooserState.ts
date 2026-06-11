import {
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    getEnterFallback,
} from '@stagistic/script';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';

import type {BlockNextElementMap} from '../fountainBlock/handlers/types';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
    normalizeFountainBlockType,
} from '../fountainCore';

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

export const OPEN_META_KEY = 'empty-enter-chooser-open';
export const CLOSE_META_KEY = 'empty-enter-chooser-close';
export const SELECT_META_KEY = 'empty-enter-chooser-select';

export interface OpenMetaPayload {
    blockId: string,
    blockPos: number,
    blockType: FountainBlockType,
    selectedType?: FountainBlockType,
}

export const normalizeWriterType = (value: unknown): FountainBlockType => {
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

export const createOpenStateFromPayload = (payload: OpenMetaPayload): EmptyEnterChooserState => {
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

export const resolveNextEmptyType = (
    selectedType: FountainBlockType,
    blockNextElements?: BlockNextElementMap,
): FountainBlockType => {
    const configured = blockNextElements?.[selectedType];

    return configured ?? normalizeFountainBlockType(getEnterFallback(selectedType));
};

export const createEmptyEnterChooserPlugin = (): Plugin<EmptyEnterChooserState> => {
    return new Plugin<EmptyEnterChooserState>({
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
    });
};
