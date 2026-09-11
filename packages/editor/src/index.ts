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
    ConvertSceneRequest,
    DeleteActRequest,
    DeleteSceneRequest,
    EditorBlockUiEvent,
    EditorBlockUiEventType,
    EditorDocumentProps,
    EditorIndexSnapshot,
    EditorLayoutProps,
    EditorLifecycleCallbacks,
    EditorLiveActiveBlockInfo,
    EditorLiveCharacterSnapshot,
    EditorLiveMusicSnapshot,
    EditorLiveScenePlacementSnapshot,
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
    ScenePlacement,
    UpdateMusicRequest,
} from './editor/contracts';
export {default as ScriptEditor} from './editor/Editor';
export {
    type EditorElementSelection,
    useEditorElementSelection,
} from './editor/elementSelection/context';
export {
    buildConvertSceneHeadingContent,
    buildDeleteSceneHeadingContent,
} from './editor/hooks/blockMutations';
export {useExclusiveOverlay} from './editor/hooks/useExclusiveOverlay';
export {useFocusEditorBlock} from './editor/hooks/useFocusEditorBlock';
export {useFocusEditorMusic} from './editor/hooks/useFocusEditorMusic';
export {EditorSnapshotStoreProvider} from './editor/live/context';
export {
    useEditorLiveActiveBlock,
    useEditorLiveActiveBlockInfo,
    useEditorLiveCharacters,
    useEditorLiveMusic,
    useEditorLiveScenePlacement,
    useEditorLiveSelector,
    useEditorLiveSnapshot,
    useEditorLiveStructure,
} from './editor/live/hooks';
export {
    createEditorSnapshotStore,
    type EditorSnapshotStore,
} from './editor/live/store';
export {
    MiniScriptEditor,
    type MiniScriptEditorProps,
} from './editor/mini/MiniScriptEditor';
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
export type {BlockNodeType} from './editor/tiptap/scriptCore';
export {normalizeCharacterColorHex} from '@stagistic/script';
