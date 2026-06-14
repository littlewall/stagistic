import type {ScriptDocument} from '@stagistic/script';

import type {BlockNodeType} from '../../../tiptap/scriptCore';

export interface TopLevelBlockMetrics {
    id: string,
    blockType: unknown,
    top: number,
    bottom: number,
    midpoint: number,
}

export interface PendingPressState {
    pointerId: number,
    startClientX: number,
    startClientY: number,
    sourceBlockId: string,
}

export interface ActiveDragState {
    pointerId: number,
    sourceBlockId: string,
    sourceBlockType: BlockNodeType,
    beforeBlockId: string | null,
}

export interface DragSessionState {
    sourceBlockId: string,
    baseDocument: ScriptDocument,
    lastPreviewBeforeBlockId: string | null,
    hasPreviewChange: boolean,
}

export interface BlockActionsPointerState {
    blockId: string,
    blockType: BlockNodeType,
    blockPos: number | null,
}
