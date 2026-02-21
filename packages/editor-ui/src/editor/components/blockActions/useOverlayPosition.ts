import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {getBlockUiEventsFromState} from '../../tiptap/extensions';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
} from '../../tiptap/fountainCore';
import type {BlockActionsPointerState} from './overlay/types';
import type {UseOverlayPositionArgs} from './types';

const getSafeHasFocus = (editor: TiptapEditor) => {
    try {
        return editor.view.hasFocus();
    } catch {
        return false;
    }
};

export const useOverlayPosition = ({
    editor,
    isMenuOpen,
}: UseOverlayPositionArgs) => {
    const [activeBlockState, setActiveBlockState] = useState<BlockActionsPointerState | null>(null);

    const updateActiveBlockState = useCallback(() => {
        if (!editor) {
            setActiveBlockState(null);

            return;
        }

        if (!getSafeHasFocus(editor) && !isMenuOpen) {
            setActiveBlockState(null);

            return;
        }

        if (isSelectionAcrossBlocks(editor.state, FOUNTAIN_BLOCK_NODE_NAME)) {
            setActiveBlockState(null);

            return;
        }

        const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (!activeBlock) {
            setActiveBlockState(null);

            return;
        }

        setActiveBlockState(previous => {
            const nextState: BlockActionsPointerState = {
                blockId: activeBlock.id,
                blockType: activeBlock.blockType,
            };

            if (
                previous
                && previous.blockId === nextState.blockId
                && previous.blockType === nextState.blockType
            ) {
                return previous;
            }

            return nextState;
        });
    }, [editor, isMenuOpen]);

    useEffect(() => {
        updateActiveBlockState();
    }, [updateActiveBlockState]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleSelectionUpdate = () => {
            updateActiveBlockState();
        };
        const handleFocus = () => {
            updateActiveBlockState();
        };
        const handleBlur = () => {
            if (isMenuOpen) {
                return;
            }

            setActiveBlockState(null);
        };
        const handleTransaction = () => {
            const events = getBlockUiEventsFromState(editor.state);
            const shouldRefresh = events.some(event => {
                return (
                    event.type === 'activeBlockChange'
                    || event.type === 'blockTypeChange'
                    || event.type === 'blockInserted'
                    || event.type === 'blockRemoved'
                    || event.type === 'blockReordered'
                );
            });

            if (!shouldRefresh) {
                return;
            }

            updateActiveBlockState();
        };

        editor.on('selectionUpdate', handleSelectionUpdate);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);
        editor.on('transaction', handleTransaction);

        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
            editor.off('transaction', handleTransaction);
        };
    }, [
        editor,
        isMenuOpen,
        updateActiveBlockState,
    ]);

    return {
        activeBlockState,
    };
};
