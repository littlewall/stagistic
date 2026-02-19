import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type CSSProperties,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import type {FountainBlockType} from '../../../tiptap/fountainCore';
import {MENU_DISABLED_BLOCK_TYPES} from './constants';
import {
    resolveOverlayStyleForBlockId as resolveOverlayStyleForBlockIdFromGeometry,
    toNumericStyleValue,
} from './geometry';
import type {
    ActiveDragState,
    DropLockState,
    OverlayAnchorStyle,
} from './types';

interface SelectionOverlayState {
    style: CSSProperties,
    blockType: FountainBlockType,
    blockId: string,
}

interface SelectionRailAnchorState {
    style: CSSProperties,
}

type SelectionOverlayStateOrNull = SelectionOverlayState | null;

type SelectionRailAnchorStateOrNull = SelectionRailAnchorState | null;

interface UseOverlayDisplayStateArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    activeDrag: ActiveDragState | null,
    dropLock: DropLockState | null,
    setDropLock: (value: DropLockState | null | ((current: DropLockState | null) => DropLockState | null)) => void,
    overlayStateFromSelection: SelectionOverlayStateOrNull,
    railAnchorStateFromSelection: SelectionRailAnchorStateOrNull,
}

export const useOverlayDisplayState = ({
    editor,
    canvasRef,
    activeDrag,
    dropLock,
    setDropLock,
    overlayStateFromSelection,
    railAnchorStateFromSelection,
}: UseOverlayDisplayStateArgs) => {
    const lastDragOverlayStyleRef = useRef<OverlayAnchorStyle | null>(null);

    const resolveOverlayStyleForBlockId = useCallback((blockId: string): OverlayAnchorStyle | null => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return null;
        }

        return resolveOverlayStyleForBlockIdFromGeometry(editor, canvas, blockId);
    }, [canvasRef, editor]);

    const dragOverlayState = useMemo(() => {
        if (!activeDrag) {
            return null;
        }

        const style = resolveOverlayStyleForBlockId(activeDrag.sourceBlockId);

        if (!style) {
            return null;
        }

        return {
            style,
            blockType: activeDrag.sourceBlockType,
            blockId: activeDrag.sourceBlockId,
        };
    }, [activeDrag, resolveOverlayStyleForBlockId]);

    useEffect(() => {
        if (dragOverlayState) {
            lastDragOverlayStyleRef.current = dragOverlayState.style;

            return;
        }

        if (!activeDrag) {
            lastDragOverlayStyleRef.current = null;
        }
    }, [activeDrag, dragOverlayState]);

    const activeOverlayState = useMemo(() => {
        if (activeDrag) {
            if (dragOverlayState) {
                return dragOverlayState;
            }

            if (lastDragOverlayStyleRef.current) {
                return {
                    style: lastDragOverlayStyleRef.current,
                    blockType: activeDrag.sourceBlockType,
                    blockId: activeDrag.sourceBlockId,
                };
            }
        }

        if (dropLock) {
            const style = resolveOverlayStyleForBlockId(dropLock.blockId) ?? dropLock.style;

            if (style) {
                return {
                    style,
                    blockType: dropLock.blockType,
                    blockId: dropLock.blockId,
                };
            }
        }

        return overlayStateFromSelection;
    }, [
        activeDrag,
        dragOverlayState,
        dropLock,
        overlayStateFromSelection,
        resolveOverlayStyleForBlockId,
    ]);

    const pointerOverlayState = useMemo(() => {
        if (overlayStateFromSelection) {
            return {
                blockId: overlayStateFromSelection.blockId,
                blockType: overlayStateFromSelection.blockType,
            };
        }

        if (dropLock) {
            return {
                blockId: dropLock.blockId,
                blockType: dropLock.blockType,
            };
        }

        return null;
    }, [dropLock, overlayStateFromSelection]);

    const activeRailAnchorState = useMemo(() => {
        if (!activeDrag) {
            return railAnchorStateFromSelection;
        }

        if (activeOverlayState) {
            return {style: activeOverlayState.style};
        }

        return railAnchorStateFromSelection;
    }, [
        activeDrag,
        activeOverlayState,
        railAnchorStateFromSelection,
    ]);

    const isMenuDisabledPointerBlock = pointerOverlayState
        ? MENU_DISABLED_BLOCK_TYPES.has(pointerOverlayState.blockType)
        : false;
    const isMenuDisabledBlock = activeOverlayState
        ? MENU_DISABLED_BLOCK_TYPES.has(activeOverlayState.blockType)
        : false;

    useEffect(() => {
        if (!dropLock) {
            return;
        }

        if (overlayStateFromSelection?.blockId === dropLock.blockId) {
            setDropLock(null);
        }
    }, [
        dropLock,
        overlayStateFromSelection,
        setDropLock,
    ]);

    useEffect(() => {
        if (!dropLock) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setDropLock(current => {
                return current?.blockId === dropLock.blockId ? null : current;
            });
        }, 220);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [dropLock, setDropLock]);

    const globalRailStyle = useMemo(() => {
        if (!activeRailAnchorState) {
            return null;
        }

        const canvas = canvasRef.current;

        if (!canvas) {
            return null;
        }

        const top = toNumericStyleValue(activeRailAnchorState.style.top);

        if (top === null) {
            return null;
        }

        return {
            top: -top,
            height: canvas.scrollHeight,
        };
    }, [activeRailAnchorState, canvasRef]);

    const getLastDragOverlayStyle = useCallback(() => {
        return lastDragOverlayStyleRef.current;
    }, []);

    return {
        pointerOverlayState,
        activeOverlayState,
        globalRailStyle,
        isMenuDisabledPointerBlock,
        isMenuDisabledBlock,
        activeRailAnchorState,
        resolveOverlayStyleForBlockId,
        getLastDragOverlayStyle,
    };
};
