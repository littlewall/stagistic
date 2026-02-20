import type {ScriptDocument} from '@stagistic/script-core';
import type {CSSProperties} from 'react';

import type {FountainBlockType} from '../../../tiptap/fountainCore';

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
    sourceBlockType: FountainBlockType,
    beforeBlockId: string | null,
}

export interface DragSessionState {
    sourceBlockId: string,
    baseDocument: ScriptDocument,
    lastPreviewBeforeBlockId: string | null,
    hasPreviewChange: boolean,
}

export interface OverlayAnchorStyle {
    top: number,
    left: number,
    width: number,
}

export interface DropLockState {
    blockId: string,
    blockType: FountainBlockType,
    style: OverlayAnchorStyle | null,
}

export interface BlockActionsOverlayState {
    style: CSSProperties,
    blockType: FountainBlockType,
    blockId: string,
}

export interface BlockActionsRailAnchorState {
    style: CSSProperties,
}

export interface BlockActionsPointerState {
    blockId: string,
    blockType: FountainBlockType,
}
