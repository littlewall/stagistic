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
    SCRIPT_BLOCK_NODE_NAMES,
    getActiveScriptBlockFromState,
    isSelectionAcrossBlocks,
} from '../../tiptap/scriptCore';
import type {BlockActionsPointerState} from './overlay/types';
import type {UseOverlayPositionArgs} from './types';

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
    const hasFocusRef = useRef(false);

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

        if (!isMenuOpen && !hasFocusRef.current) {
            commitActiveBlockState(null);

            return;
        }

        if (isSelectionAcrossBlocks(targetEditor.state, SCRIPT_BLOCK_NODE_NAMES)) {
            commitActiveBlockState(null);

            return;
        }

        const activeBlock = getActiveScriptBlockFromState(targetEditor.state, SCRIPT_BLOCK_NODE_NAMES);

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
        hasFocusRef,
        isMenuOpen,
    ]);

    useLayoutEffect(() => {
        updateActiveBlockState();
    }, [updateActiveBlockState]);

    useLayoutEffect(() => {
        if (!editor) {
            return;
        }

        hasFocusRef.current = editor.isFocused;

        const handleTransaction = () => {
            updateActiveBlockState(editor);
        };
        const handleFocus = () => {
            hasFocusRef.current = true;
            updateActiveBlockState(editor);
        };
        const handleBlur = () => {
            hasFocusRef.current = false;

            if (isMenuOpen) {
                return;
            }

            commitActiveBlockState(null);
        };

        editor.on('transaction', handleTransaction);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('transaction', handleTransaction);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
        };
    }, [
        commitActiveBlockState,
        editor,
        hasFocusRef,
        isMenuOpen,
        updateActiveBlockState,
    ]);

    return {
        activeBlockState,
    };
};
