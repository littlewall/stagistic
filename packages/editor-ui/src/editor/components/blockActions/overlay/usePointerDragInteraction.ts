import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type PointerEvent as ReactPointerEvent,
    type RefObject,
    useCallback,
    useEffect,
} from 'react';

import {setActiveBlockSyncSuppressed} from '../../../hooks/useEditorActiveBlockSync';
import {
    DRAG_DISABLED_BLOCK_TYPES,
    DRAG_START_THRESHOLD_PX,
    PRESS_TO_DRAG_VISUAL_DELAY_MS,
} from './constants';
import {collectTopLevelBlockMetrics} from './geometry';
import type {
    BlockActionsPointerState,
    DropLockState,
    OverlayAnchorStyle,
} from './types';
import {useDragRuntimeEffects} from './useDragRuntimeEffects';
import {usePointerDragState} from './usePointerDragState';

interface UsePointerDragInteractionArgs {
    context: {
        editor: TiptapEditor | null,
        canvasRef: RefObject<HTMLElement | null>,
        activeOverlayState: BlockActionsPointerState | null,
        isMenuDisabledBlock: boolean,
    },
    menu: {
        closeMenu: () => void,
        toggleMenu: () => void,
    },
    preview: {
        applyDraggedSourceHighlight: (blockId: string) => void,
        clearDraggedSourceHighlight: () => void,
        beginDragPreviewSession: (sourceBlockId: string) => void,
        clearDragPreviewSession: () => void,
        applyPreviewMove: (beforeBlockId: string | null) => void,
        revertPreviewMove: () => void,
        commitPreviewMove: (beforeBlockId: string | null) => void,
    },
    overlay: {
        resolveOverlayStyleForBlockId: (blockId: string) => OverlayAnchorStyle | null,
        getLastDragOverlayStyle: () => OverlayAnchorStyle | null,
        setDropLock: (value: DropLockState | null) => void,
    },
}
export const usePointerDragInteraction = ({
    context,
    menu,
    preview,
    overlay,
}: UsePointerDragInteractionArgs) => {
    const {
        editor,
        canvasRef,
        activeOverlayState,
        isMenuDisabledBlock,
    } = context;
    const {closeMenu, toggleMenu} = menu;
    const {
        applyDraggedSourceHighlight,
        clearDraggedSourceHighlight,
        beginDragPreviewSession,
        clearDragPreviewSession,
        applyPreviewMove,
        revertPreviewMove,
        commitPreviewMove,
    } = preview;
    const {
        resolveOverlayStyleForBlockId,
        getLastDragOverlayStyle,
        setDropLock,
    } = overlay;

    const {
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
        clearPressVisualState,
        stopPointerInteraction,
        clearDragState,
        updateActiveDragState,
    } = usePointerDragState({
        editor,
        canvasRef,
        applyPreviewMove,
        clearDraggedSourceHighlight,
    });

    useDragRuntimeEffects({
        context: {
            canvasRef,
            activeDrag,
            activeDragRef,
            dragPointerYRef,
            autoScrollFrameRef,
        },
        actions: {
            updateActiveDragState,
            stopPointerInteraction,
            revertPreviewMove,
            clearPressVisualState,
            clearDragState,
        },
    });

    useEffect(() => {
        if (!activeOverlayState && !activeDragRef.current) {
            stopPointerInteraction();
            setPendingPress(null);
            clearPressVisualState();
            clearDragState();
            clearDragPreviewSession();
        }
    }, [
        activeOverlayState,
        activeDragRef,
        clearDragPreviewSession,
        clearPressVisualState,
        clearDragState,
        setPendingPress,
        stopPointerInteraction,
    ]);

    const handleTriggerPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
        if (!editor || !activeOverlayState) {
            return;
        }

        if (isMenuDisabledBlock) {
            event.preventDefault();
            event.stopPropagation();
            editor.commands.focus();

            return;
        }

        event.preventDefault();
        event.stopPropagation();
        editor.commands.focus();

        stopPointerInteraction();
        clearPressVisualState();
        clearDragState();
        clearDragPreviewSession();

        const sourceBlockId = activeOverlayState.blockId;
        const sourceBlockType = activeOverlayState.blockType;
        const pointerId = event.pointerId;
        const startClientX = event.clientX;
        const startClientY = event.clientY;
        const canvas = canvasRef.current;
        const topLevelMetrics = editor && canvas ? collectTopLevelBlockMetrics(editor, canvas) : [];
        const sourceMetric = topLevelMetrics.find(metric => metric.id === sourceBlockId);
        const canStartDrag = sourceMetric !== undefined && !DRAG_DISABLED_BLOCK_TYPES.has(sourceMetric.blockType);

        setPendingPress({
            pointerId,
            startClientX,
            startClientY,
            sourceBlockId,
        });
        pressVisualTimeoutRef.current = window.setTimeout(() => {
            pressVisualTimeoutRef.current = null;
            setIsPressVisualActive(true);

            if (canStartDrag) {
                applyDraggedSourceHighlight(sourceBlockId);
            }
        }, PRESS_TO_DRAG_VISUAL_DELAY_MS);

        const triggerElement = event.currentTarget;
        let isDragging = false;

        try {
            triggerElement.setPointerCapture(pointerId);
        } catch {
            // Pointer capture is best-effort and may fail in unsupported environments.
        }

        const cleanup = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerCancel);

            try {
                if (triggerElement.hasPointerCapture(pointerId)) {
                    triggerElement.releasePointerCapture(pointerId);
                }
            } catch {
                // Ignore release errors when capture was not available.
            }

            setPendingPress(null);
            clearPressVisualState();

            if (!isDragging) {
                clearDraggedSourceHighlight();
            }

            interactionCleanupRef.current = null;
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== pointerId) {
                return;
            }

            const movedDistance = Math.hypot(
                moveEvent.clientX - startClientX,
                moveEvent.clientY - startClientY,
            );

            if (!isDragging && canStartDrag && movedDistance >= DRAG_START_THRESHOLD_PX) {
                isDragging = true;
                closeMenu();
                setPendingPress(null);
                clearPressVisualState();
                setActiveBlockSyncSuppressed(editor, true);
                beginDragPreviewSession(sourceBlockId);
                applyDraggedSourceHighlight(sourceBlockId);
                updateActiveDragState(pointerId, sourceBlockId, sourceBlockType, moveEvent.clientY);

                return;
            }

            if (isDragging) {
                updateActiveDragState(pointerId, sourceBlockId, sourceBlockType, moveEvent.clientY);
            }
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            if (upEvent.pointerId !== pointerId) {
                return;
            }

            if (isDragging) {
                const beforeBlockId = activeDragRef.current?.beforeBlockId ?? null;
                const dragState = activeDragRef.current;

                if (dragState) {
                    setDropLock({
                        blockId: dragState.sourceBlockId,
                        blockType: dragState.sourceBlockType,
                        style: resolveOverlayStyleForBlockId(dragState.sourceBlockId) ?? getLastDragOverlayStyle(),
                    });
                }

                commitPreviewMove(beforeBlockId);
                cleanup();
                window.requestAnimationFrame(() => {
                    clearDragState();
                });

                return;
            }

            toggleMenu();
            cleanup();
        };

        const handlePointerCancel = (cancelEvent: PointerEvent) => {
            if (cancelEvent.pointerId !== pointerId) {
                return;
            }

            revertPreviewMove();
            clearDragState();
            cleanup();
        };

        interactionCleanupRef.current = cleanup;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerCancel);
    }, [
        activeDragRef,
        activeOverlayState,
        applyDraggedSourceHighlight,
        beginDragPreviewSession,
        canvasRef,
        clearDragPreviewSession,
        clearDragState,
        clearDraggedSourceHighlight,
        clearPressVisualState,
        closeMenu,
        commitPreviewMove,
        editor,
        getLastDragOverlayStyle,
        interactionCleanupRef,
        isMenuDisabledBlock,
        pressVisualTimeoutRef,
        resolveOverlayStyleForBlockId,
        revertPreviewMove,
        setDropLock,
        setIsPressVisualActive,
        setPendingPress,
        stopPointerInteraction,
        toggleMenu,
        updateActiveDragState,
    ]);

    return {
        pendingPress,
        isPressVisualActive,
        activeDrag,
        activeDragRef,
        handleTriggerPointerDown,
        clearPressVisualState,
        clearDragState,
        stopPointerInteraction,
    };
};
