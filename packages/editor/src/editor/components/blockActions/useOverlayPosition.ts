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
    findScriptBlockByIdFromState,
    getActiveScriptBlockFromState,
    isSelectionAcrossBlocks,
    SCRIPT_BLOCK_DOM_ID_ATTRIBUTE,
    SCRIPT_BLOCK_DOM_SELECTOR,
    SCRIPT_BLOCK_NODE_NAMES,
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

const hasBlockActionsOverlayFocus = () => {
    const activeElement = document.activeElement;

    return activeElement instanceof Element
        && Boolean(activeElement.closest('[data-block-actions-overlay="true"]'));
};

/*
 * A focused music pill steals DOM focus from the editor, so the selection-based
 * active block resolves to null. Resolve the block that owns the focused pill
 * from the DOM instead, so clicking a music tag activates its block.
 */
const resolveFocusedMusicPillBlockId = () => {
    const activeElement = document.activeElement;

    if (!(activeElement instanceof Element) || !activeElement.closest('[data-music-pill]')) {
        return null;
    }

    const blockElement = activeElement.closest<HTMLElement>(SCRIPT_BLOCK_DOM_SELECTOR);

    return blockElement?.getAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE) || null;
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

        const focusedMusicPillBlockId = resolveFocusedMusicPillBlockId();

        if (focusedMusicPillBlockId) {
            const musicBlock = findScriptBlockByIdFromState(targetEditor.state, focusedMusicPillBlockId);

            if (musicBlock) {
                commitActiveBlockState({
                    blockId: musicBlock.id,
                    blockType: musicBlock.blockType,
                    blockPos: musicBlock.pos,
                });

                return;
            }
        }

        if (!isMenuOpen && !hasFocusRef.current && !hasBlockActionsOverlayFocus()) {
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

            window.requestAnimationFrame(() => {
                if (resolveFocusedMusicPillBlockId()) {
                    updateActiveBlockState(editor);

                    return;
                }

                if (!editor.isFocused && !hasBlockActionsOverlayFocus()) {
                    commitActiveBlockState(null);
                }
            });
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

    useLayoutEffect(() => {
        if (!editor) {
            return;
        }

        const handleDocumentFocusIn = () => {
            if (resolveFocusedMusicPillBlockId()) {
                updateActiveBlockState(editor);

                return;
            }

            if (editor.isFocused || isMenuOpen || hasBlockActionsOverlayFocus()) {
                return;
            }

            commitActiveBlockState(null);
        };

        document.addEventListener('focusin', handleDocumentFocusIn);

        return () => {
            document.removeEventListener('focusin', handleDocumentFocusIn);
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
