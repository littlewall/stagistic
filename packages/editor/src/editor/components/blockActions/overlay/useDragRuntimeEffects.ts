import {
    type MutableRefObject, type RefObject, useEffect,
} from 'react';

import type {BlockNodeType} from '../../../tiptap/scriptCore';
import {
    AUTO_SCROLL_EDGE_THRESHOLD_PX,
    AUTO_SCROLL_MAX_SPEED_PX,
} from './constants';
import {clamp} from './geometry';
import type {ActiveDragState} from './types';

interface UseDragRuntimeEffectsArgs {
    context: {
        canvasRef: RefObject<HTMLElement | null>,
        activeDrag: ActiveDragState | null,
        activeDragRef: MutableRefObject<ActiveDragState | null>,
        dragPointerYRef: MutableRefObject<number | null>,
        autoScrollFrameRef: MutableRefObject<number | null>,
    },
    actions: {
        updateActiveDragState: (
            pointerId: number,
            sourceBlockId: string,
            sourceBlockType: BlockNodeType,
            pointerClientY: number,
        ) => void,
        stopPointerInteraction: () => void,
        revertPreviewMove: () => void,
        clearPressVisualState: () => void,
        clearDragState: () => void,
    },
}

export const useDragRuntimeEffects = ({
    context,
    actions,
}: UseDragRuntimeEffectsArgs) => {
    const {
        canvasRef,
        activeDrag,
        activeDragRef,
        dragPointerYRef,
        autoScrollFrameRef,
    } = context;
    const {
        updateActiveDragState,
        stopPointerInteraction,
        revertPreviewMove,
        clearPressVisualState,
        clearDragState,
    } = actions;

    useEffect(() => {
        if (!activeDrag) {
            return;
        }

        const cursor = 'move';
        const previousBodyCursor = document.body.style.cursor;
        const previousRootCursor = document.documentElement.style.cursor;
        const canvas = canvasRef.current;
        const previousCanvasCursor = canvas?.style.cursor ?? '';

        document.body.style.cursor = cursor;
        document.documentElement.style.cursor = cursor;

        if (canvas) {
            canvas.style.cursor = cursor;
        }

        return () => {
            document.body.style.cursor = previousBodyCursor;
            document.documentElement.style.cursor = previousRootCursor;

            if (canvas) {
                canvas.style.cursor = previousCanvasCursor;
            }
        };
    }, [activeDrag, canvasRef]);

    useEffect(() => {
        if (!activeDrag) {
            return;
        }

        const tickAutoScroll = () => {
            const canvas = canvasRef.current;
            const dragState = activeDragRef.current;
            const pointerClientY = dragPointerYRef.current;

            if (canvas && dragState && pointerClientY !== null) {
                const canvasRect = canvas.getBoundingClientRect();
                let scrollDelta = 0;

                if (pointerClientY < canvasRect.top + AUTO_SCROLL_EDGE_THRESHOLD_PX) {
                    const ratio = (canvasRect.top + AUTO_SCROLL_EDGE_THRESHOLD_PX - pointerClientY)
                        / AUTO_SCROLL_EDGE_THRESHOLD_PX;

                    scrollDelta = -AUTO_SCROLL_MAX_SPEED_PX * clamp(ratio, 0, 1);
                }

                if (pointerClientY > canvasRect.bottom - AUTO_SCROLL_EDGE_THRESHOLD_PX) {
                    const ratio = (pointerClientY - (canvasRect.bottom - AUTO_SCROLL_EDGE_THRESHOLD_PX))
                        / AUTO_SCROLL_EDGE_THRESHOLD_PX;

                    scrollDelta = AUTO_SCROLL_MAX_SPEED_PX * clamp(ratio, 0, 1);
                }

                if (scrollDelta !== 0) {
                    const maxScrollTop = Math.max(0, canvas.scrollHeight - canvas.clientHeight);
                    const nextScrollTop = clamp(canvas.scrollTop + scrollDelta, 0, maxScrollTop);

                    if (nextScrollTop !== canvas.scrollTop) {
                        canvas.scrollTop = nextScrollTop;
                        updateActiveDragState(
                            dragState.pointerId,
                            dragState.sourceBlockId,
                            dragState.sourceBlockType,
                            pointerClientY,
                        );
                    }
                }
            }

            autoScrollFrameRef.current = window.requestAnimationFrame(tickAutoScroll);
        };

        autoScrollFrameRef.current = window.requestAnimationFrame(tickAutoScroll);

        return () => {
            if (autoScrollFrameRef.current !== null) {
                window.cancelAnimationFrame(autoScrollFrameRef.current);
                autoScrollFrameRef.current = null;
            }
        };
    }, [
        activeDrag,
        activeDragRef,
        autoScrollFrameRef,
        canvasRef,
        dragPointerYRef,
        updateActiveDragState,
    ]);

    useEffect(() => {
        return () => {
            stopPointerInteraction();
            revertPreviewMove();
            clearPressVisualState();
            clearDragState();

            if (autoScrollFrameRef.current !== null) {
                window.cancelAnimationFrame(autoScrollFrameRef.current);
                autoScrollFrameRef.current = null;
            }
        };
    }, [
        autoScrollFrameRef,
        clearDragState,
        clearPressVisualState,
        revertPreviewMove,
        stopPointerInteraction,
    ]);
};
