import {
    type Editor as TiptapEditor,
} from '@tiptap/react';
import {
    type CSSProperties,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
} from '../../tiptap/fountainCore';

type OverlayState = {
    style: CSSProperties,
    blockType: FountainBlockType,
    blockId: string,
};

const findBlockElement = (editor: TiptapEditor, from: number) => {
    try {
        const domAtPos = editor.view.domAtPos(from);
        let node: Node | null = domAtPos.node;

        if (node && node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        let element = node as HTMLElement | null;

        while (element && element !== editor.view.dom) {
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

type UseOverlayPositionArgs = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    isMenuOpen: boolean,
};

export const useOverlayPosition = ({
    editor,
    canvasRef,
    isMenuOpen,
}: UseOverlayPositionArgs) => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const rafIdRef = useRef<number | null>(null);

    const updatePosition = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !editor.view || !canvas) {
            setOverlayState(null);

            return;
        }

        try {
            if (!editor.view.hasFocus() && !isMenuOpen) {
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

        const activeBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (!activeBlock) {
            setOverlayState(null);

            return;
        }

        const target = findBlockElement(editor, activeBlock.from);

        if (!target) {
            setOverlayState(null);

            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const computed = window.getComputedStyle(target);
        const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
        const lineHeightValue = Number.parseFloat(computed.lineHeight);
        const lineOffset = Number.isFinite(lineHeightValue) ? lineHeightValue / 2 : 0;
        const top = targetRect.top - canvasRect.top + canvas.scrollTop + paddingTop + lineOffset;
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

    useLayoutEffect(() => {
        scheduleUpdatePosition();
    }, [scheduleUpdatePosition]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => scheduleUpdatePosition();

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);
        editor.on('focus', handleUpdate);
        editor.on('blur', handleUpdate);

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
            editor.off('focus', handleUpdate);
            editor.off('blur', handleUpdate);
        };
    }, [editor, scheduleUpdatePosition]);

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
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    return {
        overlayState,
    };
};
