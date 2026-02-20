import {
    ELEMENT_ACT,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainElementType,
} from '@stagistic/script-core';
import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {BlockActionsMenu} from './blockActions/BlockActionsMenu';
import type {
    ActiveDragState,
    DropLockState,
} from './blockActions/overlay/types';
import {useDragPreviewSession} from './blockActions/overlay/useDragPreviewSession';
import {useDragSourceHighlight} from './blockActions/overlay/useDragSourceHighlight';
import {useOverlayDisplayState} from './blockActions/overlay/useOverlayDisplayState';
import {usePointerDragInteraction} from './blockActions/overlay/usePointerDragInteraction';
import {useActInsertCommand} from './blockActions/useActInsertCommand';
import {useBlockActionsMenuState} from './blockActions/useBlockActionsMenuState';
import {useMenuPlacement} from './blockActions/useMenuPlacement';
import {useOverlayPosition} from './blockActions/useOverlayPosition';
import styles from './EditorBlockActionsOverlay.module.css';

interface EditorBlockActionsOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
}

const EditorBlockActionsOverlay = ({editor, canvasRef}: EditorBlockActionsOverlayProps) => {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [dropLock, setDropLock] = useState<DropLockState | null>(null);
    const {
        isMenuOpen,
        closeMenu,
        toggleMenu,
    } = useBlockActionsMenuState({
        editor,
        triggerRef,
        menuRef,
    });
    const {
        overlayState: overlayStateFromSelection,
        railAnchorState: railAnchorStateFromSelection,
    } = useOverlayPosition({
        editor,
        canvasRef,
        isMenuOpen,
    });
    const {isMenuAbove} = useMenuPlacement({
        isMenuOpen,
        canvasRef,
        triggerRef,
        menuRef,
    });
    const {
        applyDraggedSourceHighlight,
        clearDraggedSourceHighlight,
    } = useDragSourceHighlight();
    const {
        beginDragPreviewSession,
        clearDragPreviewSession,
        applyPreviewMove,
        revertPreviewMove,
        commitPreviewMove,
    } = useDragPreviewSession({editor});

    const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);
    const {
        pointerOverlayState,
        activeOverlayState,
        globalRailStyle,
        isMenuDisabledPointerBlock,
        isMenuDisabledBlock,
        activeRailAnchorState,
        resolveOverlayStyleForBlockId,
        getLastDragOverlayStyle,
    } = useOverlayDisplayState({
        editor,
        canvasRef,
        activeDrag,
        dropLock,
        setDropLock,
        overlayStateFromSelection,
        railAnchorStateFromSelection,
    });
    const {
        pendingPress,
        isPressVisualActive,
        activeDrag: activeDragState,
        handleTriggerPointerDown,
    } = usePointerDragInteraction({
        context: {
            editor,
            canvasRef,
            activeOverlayState: pointerOverlayState,
            isMenuDisabledBlock: isMenuDisabledPointerBlock,
        },
        menu: {
            closeMenu,
            toggleMenu,
        },
        preview: {
            applyDraggedSourceHighlight,
            clearDraggedSourceHighlight,
            beginDragPreviewSession,
            clearDragPreviewSession,
            applyPreviewMove,
            revertPreviewMove,
            commitPreviewMove,
        },
        overlay: {
            resolveOverlayStyleForBlockId,
            getLastDragOverlayStyle,
            setDropLock,
        },
    });

    useEffect(() => {
        if (!activeDragState) {
            setActiveDrag(null);

            return;
        }

        setActiveDrag(activeDragState);
    }, [activeDragState]);

    const handleActMouseDown = useActInsertCommand({
        editor,
        activeBlockId: activeOverlayState?.blockId ?? null,
        closeMenu,
    });

    useEffect(() => {
        closeMenu();
    }, [activeOverlayState?.blockId, closeMenu]);

    useEffect(() => {
        if (!activeOverlayState || isMenuDisabledBlock) {
            closeMenu();
        }
    }, [
        activeOverlayState,
        closeMenu,
        isMenuDisabledBlock,
    ]);

    const activeBlockInfo = useMemo(() => {
        if (!activeOverlayState) {
            return null;
        }

        const option = FOUNTAIN_BLOCKS.find(block => block.type === activeOverlayState.blockType);

        return {
            label: option?.label ?? 'Block',
            icon: BLOCK_ICONS[activeOverlayState.blockType],
        };
    }, [activeOverlayState]);

    const handleMenuItemMouseDown = useCallback((
        optionType: FountainElementType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();

        if (!editor || !activeOverlayState) {
            return;
        }

        if (optionType === activeOverlayState.blockType || activeOverlayState.blockType === ELEMENT_ACT) {
            return;
        }

        editor
            .chain()
            .focus()
            .updateAttributes(FOUNTAIN_BLOCK_NODE_NAME, {
                blockType: optionType,
                id: activeOverlayState.blockId,
            })
            .run();
    }, [
        activeOverlayState,
        closeMenu,
        editor,
    ]);

    if (!editor) {
        return null;
    }

    const anchorStyle = activeOverlayState?.style ?? activeRailAnchorState?.style;

    if (!anchorStyle) {
        return null;
    }

    return (
        <div className={styles.overlay} style={anchorStyle}>
            {globalRailStyle ? (
                <span
                    className={styles.globalRail}
                    style={globalRailStyle}
                    aria-hidden="true"
                />
            ) : null}
            {activeOverlayState ? (
                <div className={styles.controls}>
                    <button
                        className={clsx(
                            styles.trigger,
                            isMenuOpen && styles.triggerOpen,
                            isMenuDisabledBlock && styles.triggerNoHover,
                            isPressVisualActive && styles.triggerPressing,
                            activeDrag && styles.triggerDragging,
                        )}
                        type="button"
                        aria-label={`Change block type (current: ${activeBlockInfo?.label ?? 'Block'})`}
                        aria-expanded={isMenuOpen}
                        data-block-actions-trigger="true"
                        data-drag-pending={pendingPress ? 'true' : undefined}
                        ref={triggerRef}
                        onPointerDown={handleTriggerPointerDown}
                    >
                        <span className={styles.triggerGlyph} aria-hidden="true">
                            <span className={styles.triggerIcon}>
                                {activeBlockInfo?.icon ?? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        focusable="false"
                                    >
                                        <path d="M6 12h12" />
                                    </svg>
                                )}
                            </span>
                            <span className={styles.dragGrip} />
                        </span>
                    </button>
                    {isMenuOpen && !activeDrag ? (
                        <BlockActionsMenu
                            blockType={activeOverlayState.blockType}
                            isMenuAbove={isMenuAbove}
                            menuRef={menuRef}
                            onMenuItemMouseDown={handleMenuItemMouseDown}
                            onActMouseDown={handleActMouseDown}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};

export default EditorBlockActionsOverlay;
