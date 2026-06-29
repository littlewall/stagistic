import type {ScriptBlockNodeType} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {BLOCKS} from '../blocks/blockRegistry';
import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {useEditorLiveSelector} from '../live/hooks';
import {updateBlockType} from '../tiptap/scriptBlock/commands';
import {normalizeBlockNodeType} from '../tiptap/scriptCore';
import {resolveBlockActions} from './blockActions/blockActionRegistry';
import {BlockGutterControls} from './blockActions/BlockGutterControls';
import {MENU_DISABLED_BLOCK_TYPES} from './blockActions/overlay/constants';
import {useDragPreviewSession} from './blockActions/overlay/useDragPreviewSession';
import {useDragSourceHighlight} from './blockActions/overlay/useDragSourceHighlight';
import {usePointerDragInteraction} from './blockActions/overlay/usePointerDragInteraction';
import {useBlockActionsMenuState} from './blockActions/useBlockActionsMenuState';
import {useBlockActionsOverlayAnchor} from './blockActions/useBlockActionsOverlayAnchor';
import {useGutterMenuInteractions} from './blockActions/useGutterMenuInteractions';
import {useMenuPlacement} from './blockActions/useMenuPlacement';
import {useOverlayPosition} from './blockActions/useOverlayPosition';
import styles from './EditorBlockActionsOverlay.module.css';

interface EditorBlockActionsOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
}

const EditorBlockActionsOverlay = ({editor, canvasRef}: EditorBlockActionsOverlayProps) => {
    const liveRevision = useEditorLiveSelector(snapshot => snapshot.revision);
    const typeTriggerRef = useRef<HTMLButtonElement | null>(null);
    const typeMenuRef = useRef<HTMLDivElement | null>(null);
    const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
    const actionMenuRef = useRef<HTMLDivElement | null>(null);
    const {
        isMenuOpen: isTypeMenuOpen,
        closeMenu: closeTypeMenu,
        toggleMenu: toggleTypeMenu,
    } = useBlockActionsMenuState({
        editor,
        triggerRef: typeTriggerRef,
        menuRef: typeMenuRef,
    });
    const {
        isMenuOpen: isActionMenuOpen,
        closeMenu: closeActionMenu,
        toggleMenu: toggleActionMenu,
    } = useBlockActionsMenuState({
        editor,
        triggerRef: actionTriggerRef,
        menuRef: actionMenuRef,
    });
    const isAnyMenuOpen = isTypeMenuOpen || isActionMenuOpen;
    const {activeBlockState} = useOverlayPosition({
        editor,
        canvasRef,
        isMenuOpen: isAnyMenuOpen,
    });
    const {
        isMenuAbove: isTypeMenuAbove,
        menuStyle: typeMenuStyle,
    } = useMenuPlacement({
        isMenuOpen: isTypeMenuOpen,
        canvasRef,
        triggerRef: typeTriggerRef,
        menuRef: typeMenuRef,
    });
    const {
        isMenuAbove: isActionMenuAbove,
        menuStyle: actionMenuStyle,
    } = useMenuPlacement({
        isMenuOpen: isActionMenuOpen,
        canvasRef,
        triggerRef: actionTriggerRef,
        menuRef: actionMenuRef,
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
        closeGutterMenus,
        toggleTypeMenuExclusively,
        handleActionTriggerPointerDown,
        handleKeyboardTypeTriggerKeyDown,
        handleKeyboardActionTriggerKeyDown,
        handleBlockAction,
        closeActionMenuAndRestoreFocus,
    } = useGutterMenuInteractions({
        editor,
        actionTriggerRef,
        closeActionMenu,
        closeTypeMenu,
        toggleActionMenu,
        toggleTypeMenu,
    });
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
            closeMenu: closeGutterMenus,
            toggleMenu: toggleTypeMenuExclusively,
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
        closeGutterMenus();
    }, [pointerOverlayState?.blockId, closeGutterMenus]);

    useEffect(() => {
        if (!isOverlayVisible || isMenuDisabledBlock) {
            closeGutterMenus();
        }
    }, [
        isOverlayVisible,
        closeGutterMenus,
        isMenuDisabledBlock,
    ]);

    const blockActionItems = useMemo(() => {
        if (!editor || !visibleOverlayState || activeDrag) {
            return [];
        }

        return resolveBlockActions({
            editor,
            blockId: visibleOverlayState.blockId,
            blockType: visibleOverlayState.blockType,
        });
    }, [
        activeDrag,
        editor,
        liveRevision,
        visibleOverlayState,
    ]);
    const hasBlockActions = blockActionItems.length > 0;

    useEffect(() => {
        if (!hasBlockActions) {
            closeActionMenu();
        }
    }, [closeActionMenu, hasBlockActions]);

    const activeBlockInfo = useMemo(() => {
        if (!visibleOverlayState) {
            return null;
        }

        const option = BLOCKS.find(block => block.type === visibleOverlayState.blockType);

        return {
            label: option?.label ?? 'Block',
            icon: BLOCK_ICONS[visibleOverlayState.blockType] ?? (
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                >
                    <path d="M6 12h12" />
                </svg>
            ),
        };
    }, [visibleOverlayState]);

    const handleMenuItemMouseDown = useCallback((
        optionType: ScriptBlockNodeType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        closeTypeMenu();

        if (!editor || !visibleOverlayState) {
            return;
        }

        if (optionType === visibleOverlayState.blockType) {
            return;
        }

        updateBlockType(editor, normalizeBlockNodeType(optionType), visibleOverlayState.blockId);
    }, [
        closeTypeMenu,
        editor,
        visibleOverlayState,
    ]);

    if (!editor || !isOverlayVisible || !overlayAnchorStyle || !visibleOverlayState || isMenuDisabledBlock) {
        return null;
    }

    return (
        <div
            className={styles.overlay}
            data-block-actions-overlay="true"
            style={overlayAnchorStyle}
        >
            <BlockGutterControls
                block={{
                    id: visibleOverlayState.blockId,
                    type: visibleOverlayState.blockType,
                    label: activeBlockInfo?.label ?? 'Block',
                    icon: activeBlockInfo?.icon,
                }}
                actionMenu={{
                    items: blockActionItems,
                    isOpen: isActionMenuOpen,
                    isAbove: isActionMenuAbove,
                    style: actionMenuStyle,
                    triggerRef: actionTriggerRef,
                    menuRef: actionMenuRef,
                    onPointerDown: handleActionTriggerPointerDown,
                    onKeyboardKeyDown: handleKeyboardActionTriggerKeyDown,
                    onClose: closeActionMenuAndRestoreFocus,
                    onExecute: handleBlockAction,
                }}
                typeMenu={{
                    isOpen: isTypeMenuOpen,
                    isAbove: isTypeMenuAbove,
                    style: typeMenuStyle,
                    triggerRef: typeTriggerRef,
                    menuRef: typeMenuRef,
                    isPressVisualActive,
                    isDragging: Boolean(activeDrag),
                    isDisabled: isMenuDisabledBlock,
                    isDragPending: Boolean(pendingPress),
                    onPointerDown: handleTriggerPointerDown,
                    onKeyboardKeyDown: handleKeyboardTypeTriggerKeyDown,
                    onMenuItemMouseDown: handleMenuItemMouseDown,
                }}
            />
        </div>
    );
};

export default EditorBlockActionsOverlay;
