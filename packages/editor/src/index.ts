export type {EditorActCommands} from './editor/actCommands/context';
export {useEditorActCommands} from './editor/actCommands/context';
export {BLOCK_ICONS} from './editor/blocks/controls/blockIcons';
export {
    getCharacterColor,
    getCharacterColorVarName,
} from './editor/characters/characterColors';
export {
    getConfirmedCharacterColor,
    getUnconfirmedCharacterColor,
    normalizePersistentCharacterRefs,
} from './editor/characters/colorResolver';
export {EditorCanvas} from './editor/components/EditorCanvas';
export {default as EditorToolbar} from './editor/components/EditorToolbar';
export {
    EditorInstanceProvider,
    useEditorInstance,
} from './editor/context';
export type {
    DeleteActRequest,
    EditorBlockUiEvent,
    EditorBlockUiEventType,
    EditorDocumentProps,
    EditorIndexSnapshot,
    EditorLayoutProps,
    EditorLifecycleCallbacks,
    EditorLiveActiveBlockInfo,
    EditorLiveCharacterSnapshot,
    EditorLiveMusicSnapshot,
    EditorLiveSnapshot,
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
    EditorMusicCreateRequest,
    EditorMusicRemoveRequest,
    EditorProps,
    EditorSaveCallbacks,
    EditorSaveProps,
    EditorSettingsProps,
    EditorSidebarToggle,
    EditorStructureRequests,
    EditorValueChangeMeta,
    FocusBlockRequest,
    InsertActRequest,
    MoveSceneRequest,
    PersistentCharacterRef,
    PersistentMusicKind,
    PersistentMusicRef,
    RenameActRequest,
    UpdateMusicRequest,
} from './editor/contracts';
export {default as ScriptEditor} from './editor/Editor';
export {
    type EditorElementSelection,
    useEditorElementSelection,
} from './editor/elementSelection/context';
export {useExclusiveOverlay} from './editor/hooks/useExclusiveOverlay';
export {useFocusEditorBlock} from './editor/hooks/useFocusEditorBlock';
export {EditorSnapshotStoreProvider} from './editor/live/context';
export {
    useEditorLiveActiveBlock,
    useEditorLiveActiveBlockInfo,
    useEditorLiveCharacters,
    useEditorLiveMusic,
    useEditorLiveSelector,
    useEditorLiveSnapshot,
    useEditorLiveStructure,
} from './editor/live/hooks';
export {
    createEditorSnapshotStore,
    type EditorSnapshotStore,
} from './editor/live/store';
export {
    getEditorPerfMetricsSnapshot,
    incrementRouteRenderCount,
    resetEditorPerfMetrics,
} from './editor/perf/editorPerfMetrics';
export {
    type CharacterColorRefsBundle,
    createCharacterColorRefsBundle,
    createEditorSurfaceCache,
    type EditorSurfaceCache,
    type EditorSurfaceEntry,
} from './editor/surface/editorSurfaceCache';
export {
    focusFirstCharacterBlock,
    linkCharacterRef,
    renameCharacterText,
    replaceCharacterRefId,
    unlinkCharacterRef,
} from './editor/tiptap/scriptBlock/characterRefCommands';
export {normalizeCharacterColorHex} from '@stagistic/script';
