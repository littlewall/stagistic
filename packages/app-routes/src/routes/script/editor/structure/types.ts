import type {DragDropProvider} from '@dnd-kit/react';
import type {
    ScriptDocument,
    StructureSettings,
} from '@stagistic/script-core';
import type {ComponentProps} from 'react';

import type {
    StructureActRow,
    StructureRow,
    StructureSceneRow,
} from './structureRows';

export interface ActiveBlockRepository {
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<unknown>,
}

export interface UseStructureSidebarControllerArgs {
    currentScriptId: string | null,
    scriptRepository: ActiveBlockRepository,
    sourceValue: ScriptDocument | null | undefined,
}

export interface StructureSidebarData {
    value: ScriptDocument | null | undefined,
    structureSettings: StructureSettings,
    actNamePreviewById: Record<string, string>,
    activeBlockId: string | null,
}

export interface StructureSidebarActions {
    onFocusBlock: (blockId: string) => void,
    onRenameAct: (blockId: string, nextName: string) => void,
    onActNamePreview: (blockId: string, nextName: string) => void,
    onDeleteAct: (blockId: string) => void,
    onInsertAct: () => void,
    onReorderAct: (sourceActBlockId: string, beforeBlockId: string | null) => void,
    onReorderScene: (sourceSceneBlockId: string, beforeBlockId: string | null) => void,
}

export interface ScriptStructureSidebarProps {
    data: StructureSidebarData,
    actions: StructureSidebarActions,
}

export interface StructureRowSceneProps {
    scene: StructureSceneRow,
    rowIndex: number,
    isActive: boolean,
    actions: Pick<StructureSidebarActions, 'onFocusBlock'>,
}

export interface StructureRowActProps {
    act: StructureActRow,
    rowIndex: number,
    data: Pick<StructureSidebarData, 'structureSettings' | 'actNamePreviewById'>,
    actions: Pick<StructureSidebarActions, 'onFocusBlock' | 'onRenameAct' | 'onActNamePreview' | 'onDeleteAct'>,
}

export interface StructureSidebarHeaderProps {
    actions: Pick<StructureSidebarActions, 'onInsertAct'>,
}

export interface SortableCandidateObject {
    id?: unknown,
    index?: unknown,
    sortable?: {
        index?: unknown,
    } | null,
}

export type SortableCandidate = SortableCandidateObject | null | undefined;

export interface SortableMeta {
    index: number | null,
}

export type DragEndEvent = Parameters<NonNullable<ComponentProps<typeof DragDropProvider>['onDragEnd']>>[0];

export interface UseStructureSidebarDndArgs {
    rows: StructureRow[],
    rowByBlockId: Map<string, StructureRow>,
    rowIndexByBlockId: Map<string, number>,
    actions: Pick<StructureSidebarActions, 'onFocusBlock' | 'onReorderAct' | 'onReorderScene'>,
}
