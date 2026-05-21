import type {FountainElementType} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {updateBlockType} from '../tiptap/fountainBlock/commands';
import {normalizeFountainBlockType} from '../tiptap/fountainCore';
import {BlockActionsMenu} from './blockActions/BlockActionsMenu';
import {MENU_DISABLED_BLOCK_TYPES} from './blockActions/overlay/constants';
import {
    resolveFountainBlockElementById,
} from './blockActions/overlay/geometry';
import {useDragPreviewSession} from './blockActions/overlay/useDragPreviewSession';
import {useDragSourceHighlight} from './blockActions/overlay/useDragSourceHighlight';
import {usePointerDragInteraction} from './blockActions/overlay/usePointerDragInteraction';
import {useBlockActionsMenuState} from './blockActions/useBlockActionsMenuState';
import {useMenuPlacement} from './blockActions/useMenuPlacement';
import {useOverlayPosition} from './blockActions/useOverlayPosition';
import styles from './EditorBlockActionsOverlay.module.css';

interface EditorBlockActionsOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
}

type OverlayAnchorStyle = CSSProperties;

interface AnchorUpdateOptions {
    allowClearOnMiss?: boolean,
}

const EditorBlockActionsOverlay = ({editor, canvasRef}: EditorBlockActionsOverlayProps) => {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const overlayAnchorFrameRef = useRef<number | null>(null);
    const [overlayAnchorStyle, setOverlayAnchorStyle] = useState<OverlayAnchorStyle | null>(null);
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
    const updateOverlayAnchor = useCallback((options?: AnchorUpdateOptions) => {
        const allowClearOnMiss = options?.allowClearOnMiss ?? true;
        const canvas = canvasRef.current;

        if (!editor || !canvas || !visibleOverlayState) {
            if (allowClearOnMiss) {
                setOverlayAnchorStyle(null);
            }

            return false;
        }

        const blockElement = resolveFountainBlockElementById(
            editor,
            visibleOverlayState.blockId,
            visibleOverlayState.blockPos,
        );

        if (!blockElement) {
            if (allowClearOnMiss) {
                setOverlayAnchorStyle(null);
            }

            return false;
        }

        if (!canvas.contains(blockElement)) {
            if (allowClearOnMiss) {
                setOverlayAnchorStyle(null);
            }

            return false;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const blockRect = blockElement.getBoundingClientRect();
        const computed = window.getComputedStyle(blockElement);
        const paddingTopPx = Number.parseFloat(computed.paddingTop) || 0;
        const lineHeightValue = Number.parseFloat(computed.lineHeight);
        const fontSizeValue = Number.parseFloat(computed.fontSize);

        let lineHeightPx: number | undefined;

        if (Number.isFinite(lineHeightValue) && lineHeightValue > 0) {
            lineHeightPx = lineHeightValue;
        }

        if (Number.isFinite(fontSizeValue) && fontSizeValue > 0) {
            lineHeightPx = fontSizeValue * 1.2;
        }

        if (lineHeightPx === undefined) {
            lineHeightPx = 13 * 1.7;
        }

        const top = blockRect.top - canvasRect.top + canvas.scrollTop + paddingTopPx + lineHeightPx / 2;
        const left = blockRect.left - canvasRect.left;

        const nextAnchorStyle: OverlayAnchorStyle = {
            top: `${top}px`,
            left: `${left}px`,
        };

        setOverlayAnchorStyle(previous => {
            if (
                previous
                && previous.top === nextAnchorStyle.top
                && previous.left === nextAnchorStyle.left
            ) {
                return previous;
            }

            return nextAnchorStyle;
        });

        return true;
    }, [
        canvasRef,
        editor,
        visibleOverlayState,
    ]);

    const cancelScheduledOverlayAnchorUpdate = useCallback(() => {
        if (overlayAnchorFrameRef.current === null) {
            return;
        }

        window.cancelAnimationFrame(overlayAnchorFrameRef.current);
        overlayAnchorFrameRef.current = null;
    }, []);

    const scheduleOverlayAnchorUpdate = useCallback((options?: AnchorUpdateOptions) => {
        cancelScheduledOverlayAnchorUpdate();

        if (typeof window === 'undefined') {
            updateOverlayAnchor(options);

            return;
        }

        overlayAnchorFrameRef.current = window.requestAnimationFrame(() => {
            overlayAnchorFrameRef.current = null;
            updateOverlayAnchor(options);
        });
    }, [cancelScheduledOverlayAnchorUpdate, updateOverlayAnchor]);

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
    useLayoutEffect(() => {
        if (!visibleOverlayState) {
            cancelScheduledOverlayAnchorUpdate();
            updateOverlayAnchor({allowClearOnMiss: true});

            return;
        }

        updateOverlayAnchor({allowClearOnMiss: false});
        scheduleOverlayAnchorUpdate({allowClearOnMiss: true});

        return () => {
            cancelScheduledOverlayAnchorUpdate();
        };
    }, [
        cancelScheduledOverlayAnchorUpdate,
        scheduleOverlayAnchorUpdate,
        updateOverlayAnchor,
        visibleOverlayState,
    ]);

    useEffect(() => {
        if (!visibleOverlayState) {
            return;
        }

        const handleWindowResize = () => {
            scheduleOverlayAnchorUpdate();
        };

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [scheduleOverlayAnchorUpdate, visibleOverlayState]);

    useEffect(() => {
        return () => {
            cancelScheduledOverlayAnchorUpdate();
        };
    }, [cancelScheduledOverlayAnchorUpdate]);

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
