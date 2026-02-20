import type {
    EditorSettingsOverride,
    ScriptDocument,
} from '@stagistic/script-core';
import type {ReactNode} from 'react';

import type {SaveResult} from './hooks/useAutosaveController';

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

export interface EditorStructureRequests {
    focusBlockRequest?: FocusBlockRequest | null,
    insertActRequest?: InsertActRequest | null,
    renameActRequest?: RenameActRequest | null,
    deleteActRequest?: DeleteActRequest | null,
    moveSceneRequest?: MoveSceneRequest | null,
    moveActRequest?: MoveActRequest | null,
}

export interface EditorLifecycleCallbacks {
    onValueChange?: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void,
    onActiveBlockChange?: (blockId: string | null) => void,
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
    leftSidebar?: ReactNode,
    rightSidebar?: ReactNode,
    sidebarWidth?: string,
}

export interface EditorDocumentProps {
    initialValue: ScriptDocument,
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
