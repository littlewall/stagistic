import type {
    BlockShortcut,
    ScriptBlockNodeType,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {
    CSSProperties,
    MouseEvent as ReactMouseEvent,
    RefObject,
} from 'react';

import type {BlockNodeType} from '../../tiptap/scriptCore';
import type {
    BlockActionCommand,
    BlockActionItem,
} from './actionTypes';

export interface BlockActionMenuProps {
    items: readonly BlockActionItem[],
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    menuStyle: CSSProperties | undefined,
    onClose: () => void,
    onExecute: (command: BlockActionCommand) => void,
}

export interface BlockTypeMenuProps {
    blockType: BlockNodeType,
    blockShortcuts?: Partial<Record<ScriptBlockNodeType, BlockShortcut>>,
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    menuStyle: CSSProperties | undefined,
    onClose: () => void,
    onMenuItemMouseDown: (
        optionType: ScriptBlockNodeType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => void,
}

export interface UseOverlayPositionArgs {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    isMenuOpen: boolean,
}

export interface UseMenuPlacementArgs {
    isMenuOpen: boolean,
    canvasRef: RefObject<HTMLElement | null>,
    triggerRef: RefObject<HTMLButtonElement | null>,
    menuRef: RefObject<HTMLDivElement | null>,
}

export interface UseBlockActionsMenuStateArgs {
    triggerRef: RefObject<HTMLButtonElement | null>,
    menuRef: RefObject<HTMLDivElement | null>,
}
