export {BLOCK_ICONS} from './editor/blocks/controls/blockIcons';
export {
    getCharacterColor,
    getCharacterColorVarName,
} from './editor/characterColors';
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
export {default as FountainEditor} from './editor/Editor';
export {useFocusEditorBlock} from './editor/hooks/useFocusEditorBlock';
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
export {
    focusFirstCharacterBlock,
    linkCharacterRef,
    renameCharacterText,
    replaceCharacterRefId,
    unlinkCharacterRef,
} from './editor/tiptap/fountainBlock/characterRefCommands';
export type {
    DeleteActRequest,
    EditorBlockUiEvent,
    EditorBlockUiEventType,
    EditorDocumentProps,
    EditorIndexSnapshot,
    EditorLayoutProps,
    EditorLifecycleCallbacks,
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
    MoveActRequest,
    MoveSceneRequest,
    PersistentCharacterRef,
    RenameActRequest,
} from './editor/types';
export {normalizeCharacterColorHex} from '@stagistic/script-core';
