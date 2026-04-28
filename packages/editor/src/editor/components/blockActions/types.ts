import type {FountainElementType} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import type {
    MouseEvent as ReactMouseEvent,
    RefObject,
} from 'react';

import type {FountainBlockType} from '../../tiptap/fountainCore';

export interface BlockActionsMenuProps {
    blockType: FountainBlockType,
    isMenuAbove: boolean,
    menuRef: RefObject<HTMLDivElement | null>,
    onMenuItemMouseDown: (
        optionType: FountainElementType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => void,
    onActMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
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

export interface UseActInsertCommandArgs {
    editor: TiptapEditor | null,
    activeBlockId: string | null,
    closeMenu: () => void,
}
