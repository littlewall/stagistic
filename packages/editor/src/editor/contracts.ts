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
import type {EditorSettingsOverride, ScriptBlockIndexSnapshot, ScriptDocument} from '@stagistic/script';
import type {ReactNode} from 'react';

import type {SaveResult} from './hooks/useAutosaveController';
import type {EditorSnapshotStore} from './live/store';
import type {EditorSurfaceCache} from './surface/editorSurfaceCache';
import type {CommentBlockMerge, EditorCommentThreadRef} from './tiptap/extensions/comments';
import type {BlockNodeType} from './tiptap/scriptCore';

export interface PersistentCharacterRef {
    id: string;
    key: string;
    colorHex?: string | null;
}

export type PersistentMusicKind = 'song' | 'instrumental';

export interface PersistentMusicRef {
    id: string;
    title: string;
    kind: PersistentMusicKind;
    assignmentLabel?: string | null;
}

export interface EditorMusicCreateRequest {
    title: string;
    blockId: string;
    complete: (music: PersistentMusicRef) => boolean;
    cancel?: () => boolean;
}

export interface EditorMusicRemoveRequest {
    musicId: string;
    title: string;
    complete: () => boolean;
}

export interface UpdateMusicRequest {
    musicId: string;
    title: string;
    kind: PersistentMusicKind;
    requestId: number;
}

export interface FocusBlockRequest {
    blockId: string;
    requestId: number;
}

export interface InsertActRequest {
    beforeBlockId: string | null;
    requestId: number;
}

export interface RenameActRequest {
    blockId: string;
    nextName: string;
    requestId: number;
}

export interface DeleteActRequest {
    blockId: string;
    requestId: number;
}

export interface MoveSceneRequest {
    sourceSceneBlockId: string;
    beforeBlockId: string | null;
    requestId: number;
}

export interface DeleteSceneRequest {
    sceneHeadingBlockId: string;
    requestId: number;
}

export interface ConvertSceneRequest {
    sceneHeadingBlockId: string;
    targetBlockType: BlockNodeType;
    requestId: number;
}

export interface EditorValueChangeMeta {
    source: 'typing' | 'structure';
    revision: number;
}

export type EditorIndexSnapshot = ScriptBlockIndexSnapshot;
export interface EditorLiveActRow {
    kind: 'act';
    blockId: string;
    name: string;
    index: number;
}

export interface EditorLiveSceneRow {
    kind: 'scene';
    blockId: string;
    title: string;
    index: number;
}

export type EditorLiveStructureRow = EditorLiveActRow | EditorLiveSceneRow;

export interface EditorLiveStructureSnapshot {
    rows: readonly EditorLiveStructureRow[];
    rowIndexByBlockId: ReadonlyMap<string, number>;
    sceneByBlockId: ReadonlyMap<string, string>;
    actByBlockId: ReadonlyMap<string, string>;
}

export interface ScenePlacement {
    /** 1-based page the scene heading sits on. */
    startPage: number;
}

export interface EditorLiveScenePlacementSnapshot {
    byBlockId: ReadonlyMap<string, ScenePlacement>;
    /** True once pagination has produced at least one measured layout. */
    hasComputed: boolean;
}

export type EditorLiveMusicSnapshot = EditorIndexSnapshot['music'];

export interface EditorLiveCharacterSnapshot {
    countsByKey: ReadonlyMap<string, number>;
    countsByCharacterId: ReadonlyMap<string, number>;
    /** Maps characterId → the key currently displayed in the editor (from characterRefs). */
    keyByCharacterId: ReadonlyMap<string, string>;
    /** Effective tag color by key currently shown in the editor (includes active-token draft lock). */
    displayColorByKey: ReadonlyMap<string, string>;
}

export interface EditorLiveActiveBlockInfo {
    id: string | null;
    type: BlockNodeType | null;
}

export interface EditorLiveSnapshot {
    revision: number;
    index: EditorIndexSnapshot;
    structure: EditorLiveStructureSnapshot;
    scenePlacement: EditorLiveScenePlacementSnapshot;
    characters: EditorLiveCharacterSnapshot;
    music: EditorLiveMusicSnapshot;
    activeBlockId: string | null;
    activeBlockType: BlockNodeType | null;
}

export type EditorBlockUiEventType = 'activeBlockChange' | 'blockTypeChange' | 'blockInserted' | 'blockRemoved' | 'blockReordered';

export type EditorBlockUiEvent =
    | {
          type: 'activeBlockChange';
          blockId: string | null;
          previousBlockId: string | null;
      }
    | {
          type: 'blockTypeChange';
          blockId: string;
          blockType: string;
          previousBlockType: string;
      }
    | {
          type: 'blockInserted';
          blockId: string;
          blockType: string;
          orderNo: number;
      }
    | {
          type: 'blockRemoved';
          blockId: string;
          blockType: string;
          previousOrderNo: number;
      }
    | {
          type: 'blockReordered';
          blockId: string;
          orderNo: number;
          previousOrderNo: number;
      };

export interface EditorStructureRequests {
    insertActRequest?: InsertActRequest | null;
    renameActRequest?: RenameActRequest | null;
    deleteActRequest?: DeleteActRequest | null;
    moveSceneRequest?: MoveSceneRequest | null;
    deleteSceneRequest?: DeleteSceneRequest | null;
    convertSceneRequest?: ConvertSceneRequest | null;
    updateMusicRequest?: UpdateMusicRequest | null;
}

export interface EditorLifecycleCallbacks {
    onValueChange?: (value: ScriptDocument, meta?: EditorValueChangeMeta) => void;
    onIndexChange?: (snapshot: EditorIndexSnapshot, meta?: EditorValueChangeMeta) => void;
    onActiveBlockChange?: (blockId: string | null) => void;
    onBlockUiEvent?: (event: EditorBlockUiEvent) => void;
    onRequestCreateMusic?: (request: EditorMusicCreateRequest) => void;
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void;
    onOpenMusicManager?: (musicId: string) => void;
    onMusicAssigned?: (musicId: string) => void;
    onMusicUnassigned?: (musicId: string) => void;
    onRequestDeleteScene?: (sceneHeadingBlockId: string) => void;
    onRequestConvertScene?: (sceneHeadingBlockId: string, targetBlockType: BlockNodeType) => void;
    /** A comment draft started or a margin marker was clicked: reveal the Comments panel. */
    onRequestRevealComments?: () => void;
    /** An open comment underline was clicked (never opens the panel on its own). */
    onCommentAnchorClick?: (threadIds: readonly string[]) => void;
    /** Blocks were joined; block-anchored threads of `fromBlockId` belong to `toBlockId` now. */
    onCommentBlocksMerged?: (merges: readonly CommentBlockMerge[]) => void;
}

export interface EditorSaveCallbacks {
    onAutoSave?: (value: ScriptDocument) => SaveResult;
    onManualSave?: (value: ScriptDocument) => SaveResult;
    onDirtyChange?: (isDirty: boolean) => void;
}

export interface EditorSaveProps extends EditorSaveCallbacks {
    autoSaveDelayMs?: number;
}

export interface EditorSettingsProps {
    settings?: EditorSettingsOverride;
    scriptSettings?: EditorSettingsOverride;
}

export interface EditorSidebarToggle {
    isOpen: boolean;
    label: string;
    onToggle: () => void;
}

export interface EditorLayoutProps {
    autoFocus?: boolean;
    leftSidebarToggle?: EditorSidebarToggle;
    rightSidebarToggle?: EditorSidebarToggle;
    leftSidebar?: ReactNode;
    rightSidebar?: ReactNode;
    sidebarWidth?: string;
}

export interface EditorDocumentProps {
    initialValue: ScriptDocument;
    persistentCharacters?: readonly PersistentCharacterRef[];
    persistentMusic?: readonly PersistentMusicRef[];
    /** Host-owned comment thread facts (status, block anchor); content stays in the host. */
    commentThreads?: readonly EditorCommentThreadRef[];
    scriptTitle?: string;
    draftDate?: string;
}

export interface EditorProps {
    document: EditorDocumentProps;
    settings?: EditorSettingsProps;
    save?: EditorSaveProps;
    layout?: EditorLayoutProps;
    requests?: EditorStructureRequests;
    callbacks?: EditorLifecycleCallbacks;
    /**
     * Zooms the page canvas only: page width, render scale, pagination and
     * overlay placement. Chrome sizes from the shared tokens and never sees
     * this value. Defaults to 1: the page renders at its nominal size.
     */
    editorZoom?: number;
    /** Workspace-owned cache keeping the live editor surface alive across view switches. */
    surfaceCache?: EditorSurfaceCache;
    /** Workspace-owned live projection shared with UI mounted outside the editor shell. */
    liveStore?: EditorSnapshotStore;
}
