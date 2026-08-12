import type {
    BlockShortcut,
    ScriptBlockNodeType,
} from '@stagistic/script';
import {Tooltip} from '@stagistic/ui';
import clsx from 'clsx';
import type {
    CSSProperties,
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
    ReactNode,
    RefObject,
} from 'react';

import type {BlockNodeType} from '../../tiptap/scriptCore';
import styles from '../EditorBlockActionsOverlay.module.css';
import type {
    BlockActionCommand,
    BlockActionItem,
} from './actionTypes';
import {BlockActionMenu, MoreHorizontalIcon} from './BlockActionMenu';
import {BlockTypeMenu} from './BlockTypeMenu';

interface BlockGutterControlsProps {
    block: {
        id: string,
        type: BlockNodeType,
        label: string,
        icon: ReactNode,
    },
    actionMenu: {
        items: readonly BlockActionItem[],
        isOpen: boolean,
        isAbove: boolean,
        style: CSSProperties | undefined,
        triggerRef: RefObject<HTMLButtonElement | null>,
        menuRef: RefObject<HTMLDivElement | null>,
        onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void,
        onKeyboardKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void,
        onClose: () => void,
        onExecute: (command: BlockActionCommand) => void,
    },
    typeMenu: {
        isOpen: boolean,
        isAbove: boolean,
        style: CSSProperties | undefined,
        triggerRef: RefObject<HTMLButtonElement | null>,
        menuRef: RefObject<HTMLDivElement | null>,
        blockShortcuts?: Partial<Record<ScriptBlockNodeType, BlockShortcut>>,
        isPressVisualActive: boolean,
        isDragging: boolean,
        isDisabled: boolean,
        isDragPending: boolean,
        onClose: () => void,
        onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void,
        onKeyboardKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void,
        onMenuItemMouseDown: (
            optionType: ScriptBlockNodeType,
            event: ReactMouseEvent<HTMLButtonElement>,
        ) => void,
    },
}

export const BlockGutterControls = ({
    block,
    actionMenu,
    typeMenu,
}: BlockGutterControlsProps) => {
    return (
        <div className={styles.controls}>
            {actionMenu.items.length > 0 ? (
                <Tooltip label="Block actions" isDisabled={actionMenu.isOpen}>
                    <button
                        className={clsx(
                            styles.trigger,
                            styles.actionTrigger,
                            actionMenu.isOpen && styles.open,
                        )}
                        type="button"
                        aria-label="Block actions"
                        aria-haspopup="menu"
                        aria-expanded={actionMenu.isOpen}
                        data-block-action-trigger="true"
                        data-block-id={block.id}
                        data-block-type={block.type}
                        ref={actionMenu.triggerRef}
                        onPointerDown={actionMenu.onPointerDown}
                        onKeyDown={actionMenu.onKeyboardKeyDown}
                    >
                        <span className={styles.triggerGlyph} aria-hidden="true">
                            <span className={styles.triggerIcon}>
                                <MoreHorizontalIcon />
                            </span>
                        </span>
                    </button>
                </Tooltip>
            ) : null}
            <Tooltip
                label="Change block type"
                isDisabled={typeMenu.isDisabled || typeMenu.isOpen || typeMenu.isDragging}
            >
                <button
                    className={clsx(
                        styles.trigger,
                        styles.typeTrigger,
                        typeMenu.isOpen && styles.open,
                        typeMenu.isDisabled && styles.noHover,
                        typeMenu.isPressVisualActive && styles.pressing,
                        typeMenu.isDragging && styles.dragging,
                    )}
                    type="button"
                    aria-label={`Change block type (current: ${block.label})`}
                    aria-haspopup="menu"
                    aria-expanded={typeMenu.isOpen}
                    data-block-actions-trigger="true"
                    data-block-id={block.id}
                    data-block-type={block.type}
                    data-drag-pending={typeMenu.isDragPending ? 'true' : undefined}
                    ref={typeMenu.triggerRef}
                    onPointerDown={typeMenu.onPointerDown}
                    onKeyDown={typeMenu.onKeyboardKeyDown}
                >
                    <span className={styles.triggerGlyph} aria-hidden="true">
                        <span className={styles.triggerIcon}>
                            {block.icon}
                        </span>
                        <span className={styles.dragGrip} />
                    </span>
                </button>
            </Tooltip>
            {actionMenu.isOpen && !typeMenu.isDragging ? (
                <BlockActionMenu
                    items={actionMenu.items}
                    isMenuAbove={actionMenu.isAbove}
                    menuRef={actionMenu.menuRef}
                    menuStyle={actionMenu.style}
                    onClose={actionMenu.onClose}
                    onExecute={actionMenu.onExecute}
                />
            ) : null}
            {typeMenu.isOpen && !typeMenu.isDragging ? (
                <BlockTypeMenu
                    blockType={block.type}
                    blockShortcuts={typeMenu.blockShortcuts}
                    isMenuAbove={typeMenu.isAbove}
                    menuRef={typeMenu.menuRef}
                    menuStyle={typeMenu.style}
                    onClose={typeMenu.onClose}
                    onMenuItemMouseDown={typeMenu.onMenuItemMouseDown}
                />
            ) : null}
        </div>
    );
};
