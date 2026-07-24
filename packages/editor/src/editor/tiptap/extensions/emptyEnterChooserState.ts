import {
    getEnterFallback,
} from '@stagistic/script';
import {
    type EditorState,
    Plugin,
    PluginKey,
} from '@tiptap/pm/state';

import type {BlockNextElementMap} from '../scriptBlock/handlers/types';
import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
    isScriptBlockContentEmpty,
    isSelectionAcrossBlocks,
    normalizeBlockNodeType,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../scriptCore';

export interface EmptyEnterChooserState {
    isOpen: boolean,
    blockId: string | null,
    blockPos: number | null,
    blockType: BlockNodeType | null,
    selectedType: BlockNodeType | null,
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

export const EMPTY_ENTER_CHOOSER_WRITER_TYPES: readonly BlockNodeType[] = [
    'scene',
    'stageDirection',
    'character',
    'aside',
    'dialogue',
    'lyrics',
];

const EMPTY_ENTER_CHOOSER_WRITER_TYPE_SET = new Set(EMPTY_ENTER_CHOOSER_WRITER_TYPES);

export const OPEN_META_KEY = 'empty-enter-chooser-open';
export const CLOSE_META_KEY = 'empty-enter-chooser-close';
export const SELECT_META_KEY = 'empty-enter-chooser-select';

export interface OpenMetaPayload {
    blockId: string,
    blockPos: number,
    blockType: BlockNodeType,
    selectedType?: BlockNodeType,
}

export const normalizeWriterType = (value: unknown): BlockNodeType => {
    const normalized = normalizeBlockNodeType(value);

    if (EMPTY_ENTER_CHOOSER_WRITER_TYPE_SET.has(normalized)) {
        return normalized;
    }

    return 'stageDirection';
};

const isCollapsedSingleBlockSelection = (state: EditorState) => {
    if (!state.selection.empty) {
        return false;
    }

    if (isSelectionAcrossBlocks(state, SCRIPT_BLOCK_NODE_NAMES)) {
        return false;
    }

    return true;
};

const isBlockContentEmpty = (state: EditorState, blockPos: number | null) => {
    if (typeof blockPos !== 'number') {
        return false;
    }

    const nodeAtPos = state.doc.nodeAt(blockPos);

    if (!nodeAtPos) {
        return false;
    }

    return isScriptBlockContentEmpty(nodeAtPos);
};

export const createOpenStateFromPayload = (payload: OpenMetaPayload): EmptyEnterChooserState => {
    const normalizedBlockType = normalizeBlockNodeType(payload.blockType);
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

export const isEmptyEnterChooserWriterType = (value: unknown): value is BlockNodeType => {
    const normalized = normalizeBlockNodeType(value);

    return EMPTY_ENTER_CHOOSER_WRITER_TYPE_SET.has(normalized);
};

export const emptyEnterChooserKey = new PluginKey<EmptyEnterChooserState>('empty-enter-chooser');

export const getEmptyEnterChooserFromState = (state: EditorState): EmptyEnterChooserState => {
    return emptyEnterChooserKey.getState(state) ?? CLOSED_EMPTY_ENTER_CHOOSER_STATE;
};

export const resolveNextEmptyType = (
    selectedType: BlockNodeType,
    blockNextElements?: BlockNextElementMap,
): BlockNodeType => {
    const configured = blockNextElements?.[selectedType];

    return configured ?? normalizeBlockNodeType(getEnterFallback(selectedType));
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

                const activeBlock = getActiveScriptBlockFromState(newState, SCRIPT_BLOCK_NODE_NAMES);

                if (!activeBlock || activeBlock.id !== nextState.blockId) {
                    return CLOSED_EMPTY_ENTER_CHOOSER_STATE;
                }

                if (!isBlockContentEmpty(newState, activeBlock.pos)) {
                    return CLOSED_EMPTY_ENTER_CHOOSER_STATE;
                }

                const normalizedBlockType = normalizeBlockNodeType(activeBlock.blockType);
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
