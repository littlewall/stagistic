import {Extension} from '@tiptap/core';

import {
    splitBlockWithType,
    updateBlockType,
} from '../fountainBlock/commands';
import type {BlockNextElementMap} from '../fountainBlock/handlers/types';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
} from '../fountainCore';
import {
    CLOSE_META_KEY,
    createEmptyEnterChooserPlugin,
    EMPTY_ENTER_CHOOSER_WRITER_TYPES,
    getEmptyEnterChooserFromState,
    normalizeWriterType,
    OPEN_META_KEY,
    resolveNextEmptyType,
    SELECT_META_KEY,
} from './emptyEnterChooserState';

export type {EmptyEnterChooserState} from './emptyEnterChooserState';
export {
    EMPTY_ENTER_CHOOSER_WRITER_TYPES,
    emptyEnterChooserKey,
    getEmptyEnterChooserFromState,
    isEmptyEnterChooserWriterType,
} from './emptyEnterChooserState';

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
        return [createEmptyEnterChooserPlugin()];
    },
});
