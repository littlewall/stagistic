import type {FountainElementType} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {updateBlockType} from '../tiptap/fountainBlock/commands';
import {normalizeFountainBlockType} from '../tiptap/fountainCore';
import {BlockActionsMenu} from './blockActions/BlockActionsMenu';
import {MENU_DISABLED_BLOCK_TYPES} from './blockActions/overlay/constants';
import {useDragPreviewSession} from './blockActions/overlay/useDragPreviewSession';
import {useDragSourceHighlight} from './blockActions/overlay/useDragSourceHighlight';
import {usePointerDragInteraction} from './blockActions/overlay/usePointerDragInteraction';
import {useBlockActionsMenuState} from './blockActions/useBlockActionsMenuState';
import {useBlockActionsOverlayAnchor} from './blockActions/useBlockActionsOverlayAnchor';
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
    const {
        isMenuOpen,
        closeMenu,
        toggleMenu,
    } = useBlockActionsMenuState({
        editor,
        triggerRef,
        menuRef,
    });
    const {activeBlockState} = useOverlayPosition({
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
    const {
        pendingPress,
        isPressVisualActive,
        activeDrag,
        handleTriggerPointerDown,
    } = usePointerDragInteraction({
        context: {
            editor,
            canvasRef,
            activeOverlayState: activeBlockState,
            isMenuDisabledBlock: activeBlockState
                ? MENU_DISABLED_BLOCK_TYPES.has(activeBlockState.blockType)
                : false,
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
    });
    const pointerOverlayState = activeDrag
        ? {
            blockId: activeDrag.sourceBlockId,
            blockType: activeDrag.sourceBlockType,
            blockPos: null,
        }
        : activeBlockState;
    const visibleOverlayState = pointerOverlayState;
    const isOverlayVisible = visibleOverlayState !== null;
    const isMenuDisabledBlock = visibleOverlayState
        ? MENU_DISABLED_BLOCK_TYPES.has(visibleOverlayState.blockType)
        : false;

    const overlayAnchorStyle = useBlockActionsOverlayAnchor({
        editor,
        canvasRef,
        visibleOverlayState,
    });

    useEffect(() => {
        closeMenu();
    }, [pointerOverlayState?.blockId, closeMenu]);

    useEffect(() => {
        if (!isOverlayVisible || isMenuDisabledBlock) {
            closeMenu();
        }
    }, [
        isOverlayVisible,
        closeMenu,
        isMenuDisabledBlock,
    ]);

    const activeBlockInfo = useMemo(() => {
        if (!visibleOverlayState) {
            return null;
        }

        const option = FOUNTAIN_BLOCKS.find(block => block.type === visibleOverlayState.blockType);

        return {
            label: option?.label ?? 'Block',
            icon: BLOCK_ICONS[visibleOverlayState.blockType],
        };
    }, [visibleOverlayState]);

    const handleMenuItemMouseDown = useCallback((
        optionType: FountainElementType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();

        if (!editor || !visibleOverlayState) {
            return;
        }

        if (optionType === visibleOverlayState.blockType) {
            return;
        }

        updateBlockType(editor, normalizeFountainBlockType(optionType), visibleOverlayState.blockId);
    }, [
        closeMenu,
        editor,
        visibleOverlayState,
    ]);

    if (!editor || !isOverlayVisible || !overlayAnchorStyle || !visibleOverlayState || isMenuDisabledBlock) {
        return null;
    }

    return (
        <div className={styles.overlay} style={overlayAnchorStyle}>
            <div className={styles.controls}>
                <button
                    className={clsx(
                        styles.trigger,
                        isMenuOpen && styles.open,
                        isMenuDisabledBlock && styles.noHover,
                        isPressVisualActive && styles.pressing,
                        activeDrag && styles.dragging,
                    )}
                    type="button"
                    aria-label={`Change block type (current: ${activeBlockInfo?.label ?? 'Block'})`}
                    aria-expanded={isMenuOpen}
                    data-block-actions-trigger="true"
                    data-block-id={visibleOverlayState.blockId}
                    data-block-type={visibleOverlayState.blockType}
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
                        blockType={visibleOverlayState.blockType}
                        isMenuAbove={isMenuAbove}
                        menuRef={menuRef}
                        onMenuItemMouseDown={handleMenuItemMouseDown}
                    />
                ) : null}
            </div>
        </div>
    );
};

export default EditorBlockActionsOverlay;
