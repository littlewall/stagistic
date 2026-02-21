export {BLOCK_ICONS} from './editor/blocks/controls/blockIcons';
export {
    getCharacterColor,
    getCharacterColorVarName,
    normalizeCharacterColorHex,
} from './editor/characterColors';
export {EditorCanvas} from './editor/components/EditorCanvas';
export {default as EditorToolbar} from './editor/components/EditorToolbar';
export {default as FountainEditor} from './editor/Editor';
export {
    useEditorLiveActiveBlock,
    useEditorLiveCharacters,
    useEditorLiveSelector,
    useEditorLiveSnapshot,
    useEditorLiveStructure,
} from './editor/live/hooks';
export {
    getEditorPerfMetricsSnapshot,
    incrementRouteRenderCount,
    resetEditorPerfMetrics,
} from './editor/perf/editorPerfMetrics';
export type {
    DeleteActRequest,
    EditorBlockUiEvent,
    EditorBlockUiEventType,
    EditorLiveCharacterSnapshot,
    EditorLiveSnapshot,
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
    EditorDocumentProps,
    EditorIndexSnapshot,
    EditorLayoutProps,
    EditorLifecycleCallbacks,
    EditorProps,
    EditorSaveCallbacks,
    EditorSaveProps,
    EditorSettingsProps,
    EditorSidebarToggle,
    EditorStructureRequests,
    EditorValueChangeMeta,
    FocusBlockRequest,
    InsertActRequest,
    MoveActRequest,
    MoveSceneRequest,
    PersistentCharacterRef,
    RenameActRequest,
} from './editor/types';
