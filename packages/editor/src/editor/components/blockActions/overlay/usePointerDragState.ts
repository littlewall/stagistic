import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type RefObject, useCallback, useRef, useState,
} from 'react';

import type {BlockNodeType} from '../../../tiptap/scriptCore';
import {DRAG_DISABLED_BLOCK_TYPES} from './constants';
import {resolveDropLocation} from './geometry';
import type {
    ActiveDragState,
    PendingPressState,
} from './types';

interface UsePointerDragStateArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    applyPreviewMove: (beforeBlockId: string | null) => void,
    clearDraggedSourceHighlight: () => void,
}

export const usePointerDragState = ({
    editor,
    canvasRef,
    applyPreviewMove,
    clearDraggedSourceHighlight,
}: UsePointerDragStateArgs) => {
    const interactionCleanupRef = useRef<(() => void) | null>(null);
    const activeDragRef = useRef<ActiveDragState | null>(null);
    const dragPointerYRef = useRef<number | null>(null);
    const autoScrollFrameRef = useRef<number | null>(null);
    const pressVisualTimeoutRef = useRef<number | null>(null);
    const [isPressVisualActive, setIsPressVisualActive] = useState(false);
    const [pendingPress, setPendingPress] = useState<PendingPressState | null>(null);
    const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);

    const clearPressVisualState = useCallback(() => {
        if (pressVisualTimeoutRef.current !== null) {
            window.clearTimeout(pressVisualTimeoutRef.current);
            pressVisualTimeoutRef.current = null;
        }

        setIsPressVisualActive(false);
    }, []);

    const stopPointerInteraction = useCallback(() => {
        if (interactionCleanupRef.current) {
            interactionCleanupRef.current();
            interactionCleanupRef.current = null;
        }
    }, []);

    const clearDragState = useCallback(() => {
        activeDragRef.current = null;
        dragPointerYRef.current = null;
        setActiveDrag(null);
        clearDraggedSourceHighlight();
    }, [clearDraggedSourceHighlight, editor]);

    const updateActiveDragState = useCallback((
        pointerId: number,
        sourceBlockId: string,
        sourceBlockType: BlockNodeType,
        pointerClientY: number,
    ) => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return;
        }

        const resolvedDropLocation = resolveDropLocation({
            sourceBlockId,
            pointerClientY,
            editor,
            canvas,
            dragDisabledBlockTypes: DRAG_DISABLED_BLOCK_TYPES,
        });

        if (resolvedDropLocation === undefined) {
            return;
        }

        const nextActiveDrag: ActiveDragState = {
            pointerId,
            sourceBlockId,
            sourceBlockType,
            beforeBlockId: resolvedDropLocation,
        };
        const previousDrag = activeDragRef.current;
        const shouldApplyPreviewMove =
            !previousDrag
            || previousDrag.beforeBlockId !== resolvedDropLocation
            || previousDrag.sourceBlockId !== sourceBlockId
            || previousDrag.sourceBlockType !== sourceBlockType;
        const shouldUpdateActiveDrag =
            !previousDrag
            || previousDrag.pointerId !== pointerId
            || previousDrag.beforeBlockId !== resolvedDropLocation
            || previousDrag.sourceBlockId !== sourceBlockId
            || previousDrag.sourceBlockType !== sourceBlockType;

        activeDragRef.current = nextActiveDrag;
        dragPointerYRef.current = pointerClientY;

        if (shouldUpdateActiveDrag) {
            setActiveDrag(nextActiveDrag);
        }

        if (!shouldApplyPreviewMove) {
            return;
        }

        applyPreviewMove(resolvedDropLocation);
    }, [
        applyPreviewMove,
        canvasRef,
        editor,
    ]);

    return {
        interactionCleanupRef,
        activeDragRef,
        dragPointerYRef,
        autoScrollFrameRef,
        pressVisualTimeoutRef,
        pendingPress,
        setPendingPress,
        isPressVisualActive,
        setIsPressVisualActive,
        activeDrag,
        setActiveDrag,
        clearPressVisualState,
        stopPointerInteraction,
        clearDragState,
        updateActiveDragState,
    };
};
