import type {
    EditorSettingsOverride,
    ScriptDocument,
} from '@stagistic/script-core';
import type {ReactNode} from 'react';

import type {SaveResult} from './hooks/useAutosaveController';

export type PersistentCharacterRef = {
    id: string,
    key: string,
    colorHex?: string | null,
};

export type EditorProps = {
    initialValue: ScriptDocument,
    onValueChange?: (value: ScriptDocument) => void,
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    autoFocus?: boolean,
    settings?: EditorSettingsOverride,
    scriptSettings?: EditorSettingsOverride,
    leftSidebarToggle?: {
        isOpen: boolean,
        onToggle: () => void,
    },
    rightSidebarToggle?: {
        isOpen: boolean,
        onToggle: () => void,
    },
    leftSidebar?: ReactNode,
    rightSidebar?: ReactNode,
    sidebarWidth?: string,
    persistentCharacters?: readonly PersistentCharacterRef[],
    focusBlockRequest?: {
        blockId: string,
        requestId: number,
    } | null,
    insertActRequest?: {
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    renameActRequest?: {
        blockId: string,
        nextName: string,
        requestId: number,
    } | null,
    deleteActRequest?: {
        blockId: string,
        requestId: number,
    } | null,
    moveSceneRequest?: {
        sourceSceneBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    moveActRequest?: {
        sourceActBlockId: string,
        beforeBlockId: string | null,
        requestId: number,
    } | null,
    onActiveBlockChange?: (blockId: string | null) => void,
};
