import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

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

const isSameBlockActionsPointerState = (
    previous: BlockActionsPointerState | null,
    next: BlockActionsPointerState | null,
) => {
    if (previous === next) {
        return true;
    }

    if (!previous || !next) {
        return false;
    }

    return previous.blockId === next.blockId
        && previous.blockType === next.blockType
        && previous.blockPos === next.blockPos;
};

export const useOverlayPosition = ({
    editor,
    isMenuOpen,
}: UseOverlayPositionArgs) => {
    const [activeBlockState, setActiveBlockState] = useState<BlockActionsPointerState | null>(null);
    const activeBlockStateRef = useRef<BlockActionsPointerState | null>(null);

    const commitActiveBlockState = useCallback((nextState: BlockActionsPointerState | null) => {
        if (isSameBlockActionsPointerState(activeBlockStateRef.current, nextState)) {
            return;
        }

        activeBlockStateRef.current = nextState;
        setActiveBlockState(nextState);
    }, []);

    const updateActiveBlockState = useCallback((targetEditor: TiptapEditor | null = editor) => {
        if (!targetEditor) {
            commitActiveBlockState(null);

            return;
        }

        if (!isMenuOpen && !getSafeHasFocus(targetEditor)) {
            commitActiveBlockState(null);

            return;
        }

        if (isSelectionAcrossBlocks(targetEditor.state, FOUNTAIN_BLOCK_NODE_NAME)) {
            commitActiveBlockState(null);

            return;
        }

        const activeBlock = getActiveFountainBlockFromState(targetEditor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (!activeBlock) {
            commitActiveBlockState(null);

            return;
        }

        commitActiveBlockState({
            blockId: activeBlock.id,
            blockType: activeBlock.blockType,
            blockPos: activeBlock.pos,
        });
    }, [
        commitActiveBlockState,
        editor,
        isMenuOpen,
    ]);

    useLayoutEffect(() => {
        updateActiveBlockState();
    }, [updateActiveBlockState]);

    useLayoutEffect(() => {
        if (!editor) {
            return;
        }

        const handleSelectionUpdate = () => {
            updateActiveBlockState(editor);
        };
        const handleFocus = () => {
            updateActiveBlockState(editor);
        };
        const handleUpdate = () => {
            updateActiveBlockState(editor);
        };
        const handleBlur = () => {
            if (isMenuOpen) {
                updateActiveBlockState(editor);

                return;
            }

            commitActiveBlockState(null);
        };

        editor.on('selectionUpdate', handleSelectionUpdate);
        editor.on('focus', handleFocus);
        editor.on('update', handleUpdate);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
            editor.off('focus', handleFocus);
            editor.off('update', handleUpdate);
            editor.off('blur', handleBlur);
        };
    }, [
        commitActiveBlockState,
        editor,
        isMenuOpen,
        updateActiveBlockState,
    ]);

    return {
        activeBlockState,
    };
};
