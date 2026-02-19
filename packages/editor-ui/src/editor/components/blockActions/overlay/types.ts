import type {ScriptDocument} from '@stagistic/script-core';

import type {FountainBlockType} from '../../../tiptap/fountainCore';

export type TopLevelBlockMetrics = {
    id: string,
    blockType: unknown,
    top: number,
    bottom: number,
    midpoint: number,
};

export type PendingPressState = {
    pointerId: number,
    startClientX: number,
    startClientY: number,
    sourceBlockId: string,
};

export type ActiveDragState = {
    pointerId: number,
    sourceBlockId: string,
    sourceBlockType: FountainBlockType,
    pointerClientY: number,
    beforeBlockId: string | null,
};

export type DragSessionState = {
    sourceBlockId: string,
    baseDocument: ScriptDocument,
    lastPreviewBeforeBlockId: string | null,
    hasPreviewChange: boolean,
};

export type OverlayAnchorStyle = {
    top: number,
    left: number,
    width: number,
};

export type DropLockState = {
    blockId: string,
    blockType: FountainBlockType,
    style: OverlayAnchorStyle | null,
};
