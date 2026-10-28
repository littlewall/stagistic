import type {DragDropProvider} from '@dnd-kit/react';
import type {ComponentProps} from 'react';

import type {StructureGroup} from './structureRows';

export interface StructureRowSceneProps {
    blockId: string,
    title: string,
    sceneNumber: number,
    index: number,
    groupId: string,
    isActive: boolean,
    /** 1-based page the scene starts on; omitted until pagination has measured. */
    startPage?: number,
    /** A saved draft or version: the scene can be focused but not dragged. */
    isReadOnly?: boolean,
    onFocus: (blockId: string) => void,
}

export interface StructureRowActContentProps {
    blockId: string,
    name: string,
    isFirstAct: boolean,
    namePreview: string | undefined,
    onRename: (blockId: string, nextName: string) => void,
    onNamePreview: (blockId: string, nextName: string) => void,
    onNamePreviewClear: (blockId: string) => void,
    onDelete: (blockId: string) => void,
    /** A saved draft or version: the name shows but cannot change, and there is no delete. */
    isReadOnly?: boolean,
}

export interface StructureRowActProps extends StructureRowActContentProps {
    index: number,
}

export type DragEndEvent = Parameters<NonNullable<ComponentProps<typeof DragDropProvider>['onDragEnd']>>[0];
export type DragOverEvent = Parameters<NonNullable<ComponentProps<typeof DragDropProvider>['onDragOver']>>[0];

export interface UseStructureSidebarDndArgs {
    groups: readonly StructureGroup[],
    onReorderScene: (sourceBlockId: string, beforeBlockId: string | null) => void,
}
