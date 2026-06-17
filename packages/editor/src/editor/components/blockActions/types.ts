import type {ScriptBlockNodeType} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {
    CSSProperties,
    MouseEvent as ReactMouseEvent,
    RefObject,
} from 'react';

import type {BlockNodeType} from '../../tiptap/scriptCore';

export interface BlockActionsMenuProps {
    blockType: BlockNodeType,
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    menuStyle: CSSProperties | undefined,
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
    editor: TiptapEditor | null,
    triggerRef: RefObject<HTMLButtonElement | null>,
    menuRef: RefObject<HTMLDivElement | null>,
}
