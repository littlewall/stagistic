import {
    type BlockShortcut,
    type ScriptBlockNodeType,
} from '@stagistic/script';
import type {
    MouseEvent as ReactMouseEvent,
    ReactNode,
    RefObject,
} from 'react';

export interface InlineMarksGroupState {
    canUndo: boolean,
    canRedo: boolean,
    isBoldActive: boolean,
    isItalicActive: boolean,
    isUnderlineActive: boolean,
}

export interface InlineMarksGroupActions {
    onUndoMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onRedoMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onBoldMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onItalicMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onUnderlineMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
}

export interface InlineMarksGroupProps {
    state: InlineMarksGroupState,
    actions: InlineMarksGroupActions,
}

export interface BlockTypeSelectOption {
    type: ScriptBlockNodeType,
    label: string,
}

export interface VisibleBlockInfo {
    label: string,
    icon: ReactNode,
}

export interface ActiveBlockInfo {
    type: ScriptBlockNodeType,
}

export interface BlockTypeSelectState {
    isOpen: boolean,
    canChangeBlockType: boolean,
    visibleBlockInfo: VisibleBlockInfo | null,
    activeBlockInfo: ActiveBlockInfo | null,
}

export interface BlockTypeSelectActions {
    onSelectMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void,
    onMenuItemMouseDown: (
        optionType: ScriptBlockNodeType,
        event: ReactMouseEvent<HTMLButtonElement>,
    ) => void,
}

export interface BlockTypeSelectProps {
    options: readonly BlockTypeSelectOption[],
    blockShortcuts?: Partial<Record<ScriptBlockNodeType, BlockShortcut>>,
    dropdownRef: RefObject<HTMLDivElement | null>,
    state: BlockTypeSelectState,
    actions: BlockTypeSelectActions,
}
