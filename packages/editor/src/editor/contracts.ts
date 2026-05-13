/*
 * Editor public contract.
 *
 * The Editor component takes one EditorProps object grouped by concern:
 *
 *   document   — the script document being edited and its character state
 *   settings   — visual/typography overrides (saturation, structure markers, …)
 *   save       — autosave and manual save callbacks
 *   layout     — auto-focus and sidebar slots (also accepted as React children)
 *   requests   — structural mutations driven from outside (insert/rename/move acts)
 *   callbacks  — value/index/active-block change notifications and block UI events
 *
 * Data flows in via `document` and `settings`; changes flow back out via
 * `callbacks`. Save callbacks are wired separately so the editor can debounce
 * autosave without coupling it to value-change notifications.
 */
import type {
    EditorSettingsOverride,
    ScriptBlockIndexSnapshot,
    ScriptDocument,
    ScriptDocumentNodeMode,
} from '@stagistic/script';
import type {ReactNode} from 'react';

import type {SaveResult} from './hooks/useAutosaveController';
import type {FountainBlockType} from './tiptap/fountainCore';

export interface PersistentCharacterRef {
    id: string,
    key: string,
    colorHex?: string | null,
}

export interface FocusBlockRequest {
    blockId: string,
    requestId: number,
}

export interface InsertActRequest {
    beforeBlockId: string | null,
    requestId: number,
}

export interface RenameActRequest {
    blockId: string,
    nextName: string,
    requestId: number,
}

export interface DeleteActRequest {
    blockId: string,
    requestId: number,
}

export interface MoveSceneRequest {
    sourceSceneBlockId: string,
    beforeBlockId: string | null,
    requestId: number,
}

export interface MoveActRequest {
    sourceActBlockId: string,
    beforeBlockId: string | null,
    requestId: number,
}

export interface EditorValueChangeMeta {
    source: 'typing' | 'structure',
    revision: number,
}

export type EditorIndexSnapshot = ScriptBlockIndexSnapshot;
export interface EditorLiveActRow {
    kind: 'act',
    blockId: string,
    name: string,
    index: number,
}

export interface EditorLiveSceneRow {
    kind: 'scene',
    blockId: string,
    title: string,
    index: number,
}

export type EditorLiveStructureRow = EditorLiveActRow | EditorLiveSceneRow;

export interface EditorLiveStructureSnapshot {
    rows: readonly EditorLiveStructureRow[],
    rowIndexByBlockId: ReadonlyMap<string, number>,
    sceneByBlockId: ReadonlyMap<string, string>,
}

export interface EditorLiveCharacterSnapshot {
    countsByKey: ReadonlyMap<string, number>,
    countsByCharacterId: ReadonlyMap<string, number>,
    /** Maps characterId → the key currently displayed in the editor (from characterRefs). */
    keyByCharacterId: ReadonlyMap<string, string>,
    /** Effective tag color by key currently shown in the editor (includes active-token draft lock). */
    displayColorByKey: ReadonlyMap<string, string>,
}

export interface EditorLiveActiveBlockInfo {
    id: string | null,
    type: FountainBlockType | null,
}

export interface EditorLiveSnapshot {
    revision: number,
    index: EditorIndexSnapshot,
    structure: EditorLiveStructureSnapshot,
    characters: EditorLiveCharacterSnapshot,
    activeBlockId: string | null,
    activeBlockType: FountainBlockType | null,
}

export type EditorBlockUiEventType =
    | 'activeBlockChange'
    | 'blockTypeChange'
    | 'blockInserted'
    | 'blockRemoved'
    | 'blockReordered';

export type EditorBlockUiEvent =
    | {
        type: 'activeBlockChange',
        blockId: string | null,
        previousBlockId: string | null,
    }
    | {
        type: 'blockTypeChange',
        blockId: string,
        blockType: string,
        previousBlockType: string,
    }
    | {
        type: 'blockInserted',
        blockId: string,
        blockType: string,
        orderNo: number,
    }
    | {
        type: 'blockRemoved',
        blockId: string,
        blockType: string,
        previousOrderNo: number,
    }
    | {
        type: 'blockReordered',
        blockId: string,
        orderNo: number,
        previousOrderNo: number,
    };

export interface EditorStructureRequests {
    insertActRequest?: InsertActRequest | null,
    renameActRequest?: RenameActRequest | null,
    deleteActRequest?: DeleteActRequest | null,
    moveSceneRequest?: MoveSceneRequest | null,
    moveActRequest?: MoveActRequest | null,
}

export interface EditorLifecycleCallbacks {
    onValueChange?: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
    onIndexChange?: (snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void,
    onActiveBlockChange?: (blockId: string | null) => void,
    onBlockUiEvent?: (event: EditorBlockUiEvent) => void,
}

export interface EditorSaveCallbacks {
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
}

export interface EditorSaveProps extends EditorSaveCallbacks {
    autoSaveDelayMs?: number,
}

export interface EditorSettingsProps {
    settings?: EditorSettingsOverride,
    scriptSettings?: EditorSettingsOverride,
}

export interface EditorSidebarToggle {
    isOpen: boolean,
    onToggle: () => void,
}

export interface EditorLayoutProps {
    autoFocus?: boolean,
    leftSidebarToggle?: EditorSidebarToggle,
    rightSidebarToggle?: EditorSidebarToggle,
    leftSidebarHeader?: ReactNode,
    rightSidebarHeader?: ReactNode,
    leftSidebar?: ReactNode,
    rightSidebar?: ReactNode,
    sidebarWidth?: string,
}

export interface EditorDocumentProps {
    initialValue: ScriptDocument,
    nodeMode?: ScriptDocumentNodeMode,
    persistentCharacters?: readonly PersistentCharacterRef[],
}

export interface EditorProps {
    document: EditorDocumentProps,
    settings?: EditorSettingsProps,
    save?: EditorSaveProps,
    layout?: EditorLayoutProps,
    requests?: EditorStructureRequests,
    callbacks?: EditorLifecycleCallbacks,
}
