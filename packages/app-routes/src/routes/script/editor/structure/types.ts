import type {DragDropProvider} from '@dnd-kit/react';
import type {
    ScriptBlockIndexSnapshot,
    ScriptDocument,
} from '@stagistic/script';
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
    /** Used for act-name preview cleanup. Pass `initialValue` (stable DB snapshot). */
    sourceValue?: ScriptDocument | null,
}

export interface StructureSidebarData {
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    actNamePreviewById: Record<string, string>,
}

/**
 * External actions provided by the route to the structure sidebar.
 * Note: block focus is NOT here — the sidebar calls useFocusEditorBlock() directly.
 */
export interface StructureSidebarActions {
    onRenameAct: (blockId: string, nextName: string) => void,
    onActNamePreview: (blockId: string, nextName: string) => void,
    onDeleteAct: (blockId: string) => void,
    onInsertAct: () => void,
    onReorderScene: (sourceSceneBlockId: string, beforeBlockId: string | null) => void,
}

/** Shared internal focus action used by row components and DnD. */
export interface FocusBlockAction {
    onFocusBlock: (blockId: string) => void,
}

export interface ScriptStructureSidebarProps {
    data: StructureSidebarData,
    actions: StructureSidebarActions,
}

export interface StructureRowSceneProps {
    scene: StructureSceneRow,
    rowIndex: number,
    isActive: boolean,
    actions: FocusBlockAction,
}

export interface StructureRowActProps {
    act: StructureActRow,
    isFirstAct: boolean,
    data: Pick<StructureSidebarData, 'actNamePreviewById'>,
    actions: FocusBlockAction & Pick<StructureSidebarActions, 'onRenameAct' | 'onActNamePreview' | 'onDeleteAct'>,
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
    rows: readonly StructureRow[],
    rowByBlockId: ReadonlyMap<string, StructureRow>,
    rowIndexByBlockId: ReadonlyMap<string, number>,
    actions: FocusBlockAction & Pick<StructureSidebarActions, 'onReorderScene'>,
}
