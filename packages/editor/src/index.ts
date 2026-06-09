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
    EditorLiveSnapshot,
    EditorLiveStructureRow,
    EditorLiveStructureSnapshot,
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
    RenameActRequest,
} from './editor/contracts';
export {default as FountainEditor} from './editor/Editor';
export {useExclusiveOverlay} from './editor/hooks/useExclusiveOverlay';
export {useFocusEditorBlock} from './editor/hooks/useFocusEditorBlock';
export {
    useEditorLiveActiveBlock,
    useEditorLiveActiveBlockInfo,
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
export {
    focusFirstCharacterBlock,
    linkCharacterRef,
    renameCharacterText,
    replaceCharacterRefId,
    unlinkCharacterRef,
} from './editor/tiptap/fountainBlock/characterRefCommands';
export {normalizeCharacterColorHex} from '@stagistic/script';
