import type {DragDropProvider} from '@dnd-kit/react';
import type {
    ScriptBlockIndexSnapshot,
    ScriptDocument,
} from '@stagistic/script';
import type {ComponentProps} from 'react';

import type {StructureGroup} from './structureRows';

export interface ActiveBlockRepository {
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<unknown>,
}

export interface UseStructureSidebarControllerArgs {
    currentScriptId: string | null,
    scriptRepository: ActiveBlockRepository,
    /** Used for act-name preview cleanup. Pass `initialValue` (stable DB snapshot). */
    sourceValue?: ScriptDocument | null,
}

export interface StructureSidebarData {
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    actNamePreviewById: Record<string, string>,
}

export interface StructureSidebarActions {
    onRenameAct: (blockId: string, nextName: string) => void,
    onActNamePreview: (blockId: string, nextName: string) => void,
    onDeleteAct: (blockId: string) => void,
    onInsertAct: () => void,
    onReorderScene: (sourceSceneBlockId: string, beforeBlockId: string | null) => void,
}

export interface ScriptStructureSidebarProps {
    data: StructureSidebarData,
    actions: StructureSidebarActions,
}

export interface StructureRowSceneProps {
    blockId: string,
    title: string,
    index: number,
    groupId: string,
    isActive: boolean,
    onFocus: () => void,
}

export interface StructureRowActProps {
    blockId: string,
    name: string,
    isFirstAct: boolean,
    namePreview: string | undefined,
    onRename: (blockId: string, nextName: string) => void,
    onNamePreview: (blockId: string, nextName: string) => void,
    onDelete: (blockId: string) => void,
}

export type DragEndEvent = Parameters<NonNullable<ComponentProps<typeof DragDropProvider>['onDragEnd']>>[0];

export interface UseStructureSidebarDndArgs {
    groups: readonly StructureGroup[],
    onReorderScene: (sourceBlockId: string, beforeBlockId: string | null) => void,
}
