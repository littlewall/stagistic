import {
    type EditorView,
} from '@tiptap/pm/view';
import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
} from '../../tiptap/fountainCore';
import type {
    BlockActionsOverlayState,
    BlockActionsRailAnchorState,
} from './overlay/types';
import type {
    UseOverlayPositionArgs,
} from './types';

const getSafeEditorView = (editor: TiptapEditor): EditorView | null => {
    try {
        return editor.view;
    } catch {
        return null;
    }
};

const findBlockElement = (view: EditorView, from: number) => {
    try {
        const domAtPos = view.domAtPos(from);
        let node: Node | null = domAtPos.node;

        if (node && node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        let element = node as HTMLElement | null;

        while (element && element !== view.dom) {
            if (element.dataset?.fountainBlock) {
                return element;
            }

            element = element.parentElement;
        }
    } catch {
        return null;
    }

    return null;
};

export const useOverlayPosition = ({
    editor,
    canvasRef,
    isMenuOpen,
}: UseOverlayPositionArgs) => {
    const [overlayState, setOverlayState] = useState<BlockActionsOverlayState | null>(null);
    const [railAnchorState, setRailAnchorState] = useState<BlockActionsRailAnchorState | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const cancelScheduledUpdate = useCallback(() => {
        if (rafIdRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
    }, []);

    const updatePosition = useCallback(() => {
        const canvas = canvasRef.current;
        const view = editor
            ? getSafeEditorView(editor)
            : null;

        if (!editor || !view || !canvas) {
            setOverlayState(null);
            setRailAnchorState(null);

            return;
        }

        const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);
        const activeTarget = activeBlock
            ? findBlockElement(view, activeBlock.from)
            : null;
        const fallbackTarget = view.dom.querySelector<HTMLElement>('[data-fountain-block]');
        const railTarget = activeTarget ?? fallbackTarget;
        const resolveLineCenterTop = (target: HTMLElement, blockFrom: number | null) => {
            const canvasRect = canvas.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const computed = window.getComputedStyle(target);
            const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
            const lineHeightValue = Number.parseFloat(computed.lineHeight);
            const baseTop = targetRect.top - canvasRect.top + canvas.scrollTop + paddingTop;

            if (Number.isFinite(lineHeightValue) && lineHeightValue > 0) {
                return baseTop + (lineHeightValue / 2);
            }

            if (blockFrom !== null) {
                try {
                    const caretCoords = view.coordsAtPos(blockFrom);

                    return ((caretCoords.top + caretCoords.bottom) / 2) - canvasRect.top + canvas.scrollTop;
                } catch {
                    // Fall through to base top fallback.
                }
            }

            return baseTop;
        };

        if (railTarget) {
            const canvasRect = canvas.getBoundingClientRect();
            const targetRect = railTarget.getBoundingClientRect();
            const blockFrom = activeBlock && activeTarget ? activeBlock.from : null;
            const top = resolveLineCenterTop(railTarget, blockFrom);

            const left = targetRect.left - canvasRect.left + canvas.scrollLeft;

            setRailAnchorState(previous => {
                const nextState = {
                    style: {
                        top,
                        left,
                        width: targetRect.width,
                    },
                };

                if (
                    previous
                    && previous.style.top === nextState.style.top
                    && previous.style.left === nextState.style.left
                    && previous.style.width === nextState.style.width
                ) {
                    return previous;
                }

                return nextState;
            });
        }

        if (railTarget === null) {
            setRailAnchorState(null);
        }

        try {
            if (!view.hasFocus() && !isMenuOpen) {
                setOverlayState(null);

                return;
            }
        } catch {
            setOverlayState(null);

            return;
        }

        if (isSelectionAcrossBlocks(editor.state, FOUNTAIN_BLOCK_NODE_NAME)) {
            setOverlayState(null);

            return;
        }

        if (!activeBlock || !activeTarget) {
            setOverlayState(null);

            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const targetRect = activeTarget.getBoundingClientRect();
        const top = resolveLineCenterTop(activeTarget, activeBlock.from);

        const left = targetRect.left - canvasRect.left + canvas.scrollLeft;

        setOverlayState(prev => {
            const nextState = {
                style: {
                    top,
                    left,
                    width: targetRect.width,
                },
                blockType: activeBlock.blockType,
                blockId: activeBlock.id,
            };

            if (!prev) {
                return nextState;
            }

            if (
                prev.blockId === nextState.blockId
                && prev.blockType === nextState.blockType
                && prev.style.top === nextState.style.top
                && prev.style.left === nextState.style.left
                && prev.style.width === nextState.style.width
            ) {
                return prev;
            }

            return nextState;
        });
    }, [
        canvasRef,
        editor,
        isMenuOpen,
    ]);

    const scheduleUpdatePosition = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            updatePosition();
        });
    }, [updatePosition]);

    const runUpdatePositionNow = useCallback(() => {
        cancelScheduledUpdate();
        updatePosition();
    }, [cancelScheduledUpdate, updatePosition]);

    useLayoutEffect(() => {
        runUpdatePositionNow();
    }, [runUpdatePositionNow]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleSelectionUpdate = () => runUpdatePositionNow();
        const handleTransaction = () => scheduleUpdatePosition();
        const handleFocus = () => runUpdatePositionNow();
        const handleBlur = () => {
            cancelScheduledUpdate();
            setOverlayState(null);
        };

        editor.on('selectionUpdate', handleSelectionUpdate);
        editor.on('transaction', handleTransaction);
        editor.on('focus', handleFocus);
        editor.on('blur', handleBlur);

        return () => {
            editor.off('selectionUpdate', handleSelectionUpdate);
            editor.off('transaction', handleTransaction);
            editor.off('focus', handleFocus);
            editor.off('blur', handleBlur);
        };
    }, [
        cancelScheduledUpdate,
        editor,
        runUpdatePositionNow,
        scheduleUpdatePosition,
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const handleScroll = () => scheduleUpdatePosition();

        canvas.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            canvas.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [canvasRef, scheduleUpdatePosition]);

    useEffect(() => {
        return () => {
            cancelScheduledUpdate();
        };
    }, [cancelScheduledUpdate]);

    return {
        overlayState,
        railAnchorState,
    };
};
