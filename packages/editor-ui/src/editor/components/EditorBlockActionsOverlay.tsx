import {
    ELEMENT_ACT,
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
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';
import {FOUNTAIN_BLOCK_NODE_NAME} from '../tiptap/fountainCore';
import {BlockActionsMenu} from './blockActions/BlockActionsMenu';
import {useActInsertCommand} from './blockActions/useActInsertCommand';
import {useBlockActionsMenuState} from './blockActions/useBlockActionsMenuState';
import {useMenuPlacement} from './blockActions/useMenuPlacement';
import {useOverlayPosition} from './blockActions/useOverlayPosition';
import styles from './EditorBlockActionsOverlay.module.css';

type EditorBlockActionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
};

const STRUCTURE_BLOCK_TYPES = new Set([ELEMENT_ACT]);

const EditorBlockActionsOverlay = ({editor, canvasRef}: EditorBlockActionsOverlayProps) => {
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const {
        isMenuOpen,
        closeMenu,
        handleTriggerMouseDown,
    } = useBlockActionsMenuState({
        editor,
        triggerRef,
        menuRef,
    });
    const {
        overlayState,
        railAnchorState,
    } = useOverlayPosition({
        editor,
        canvasRef,
        isMenuOpen,
    });
    const isStructureBlock = overlayState
        ? STRUCTURE_BLOCK_TYPES.has(overlayState.blockType)
        : false;
    const activeOverlayState = overlayState;
    const activeRailAnchorState = railAnchorState;
    const {isMenuAbove} = useMenuPlacement({
        isMenuOpen,
        canvasRef,
        triggerRef,
        menuRef,
    });

    const handleActMouseDown = useActInsertCommand({
        editor,
        activeBlockId: activeOverlayState?.blockId ?? null,
        closeMenu,
    });

    useEffect(() => {
        closeMenu();
    }, [activeOverlayState?.blockId, closeMenu]);

    useEffect(() => {
        if (!activeOverlayState) {
            closeMenu();
        }
    }, [activeOverlayState, closeMenu]);

    useEffect(() => {
        if (isStructureBlock) {
            closeMenu();
        }
    }, [closeMenu, isStructureBlock]);

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

    const globalRailStyle = useMemo(() => {
        if (!activeRailAnchorState) {
            return null;
        }

        const canvas = canvasRef.current;

        if (!canvas) {
            return null;
        }

        const top = typeof activeRailAnchorState.style.top === 'number'
            ? activeRailAnchorState.style.top
            : Number.parseFloat(String(activeRailAnchorState.style.top ?? 0));

        if (!Number.isFinite(top)) {
            return null;
        }

        return {
            top: -top,
            height: canvas.scrollHeight,
        };
    }, [activeRailAnchorState, canvasRef]);

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

        if (optionType === activeOverlayState.blockType) {
            return;
        }

        if (activeOverlayState.blockType === ELEMENT_ACT) {
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
                            isStructureBlock && styles.triggerNoHover,
                        )}
                        type="button"
                        aria-label={`Change block type (current: ${activeBlockInfo?.label ?? 'Block'})`}
                        aria-expanded={isMenuOpen}
                        data-block-actions-trigger="true"
                        ref={triggerRef}
                        onMouseDown={event => {
                            if (isStructureBlock) {
                                event.preventDefault();
                                event.stopPropagation();
                                editor?.commands.focus();

                                return;
                            }

                            handleTriggerMouseDown(event);
                        }}
                    >
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
                    </button>
                    {isMenuOpen ? (
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
