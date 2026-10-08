import {
    coerceUnknownBlocksToStageDirections,
    DEFAULT_SCENE_NUMBER_FORMAT,
    type ScriptDocument,
} from '@stagistic/script';
import {
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {EditorActCommandsProvider} from './actCommands/context';
import {buildEditorRootStyle} from './buildRootStyle';
import {EditorShell} from './components/editorShell/EditorShell';
import {EditorInstanceProvider} from './context';
import type {EditorProps} from './contracts';
import {
    getEditorCssVars,
    resolveEditorSettings,
    selectEditorRebuildSettings,
} from './editorSettings';
import {useEditorRuntimeSettings} from './editorSettings/useEditorRuntimeSettings';
import {LeftSidebar, RightSidebar} from './editorSlots';
import {EditorElementSelectionProvider} from './elementSelection/context';
import {serializeDocumentForSave} from './hooks/useAutosaveController';
import {useCommentCallbacksRef} from './hooks/useCommentCallbacksRef';
import {useEditorAutosave} from './hooks/useEditorAutosave';
import {useEditorCharacterColors} from './hooks/useEditorCharacterColors';
import {useEditorCharacterSync} from './hooks/useEditorCharacterSync';
import {useEditorReadOnly, useInitialContentSignature} from './hooks/useEditorCollaborationMode';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {useEditorSidebarLayout} from './hooks/useEditorSidebarLayout';
import {useInitialCanvasReady} from './hooks/usePaginationReady';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import {EditorSnapshotStoreProvider} from './live/context';
import {getBlockNextElements, getBlockShortcuts} from './model/blockSettingMaps';
import {EditorSceneNumberFormatContext} from './sceneNumberFormatContext';
import {type CharacterColorRefsBundle, createCharacterColorRefsBundle} from './surface/editorSurfaceCache';
import {useScriptEditorInstance} from './surface/useScriptEditorInstance';
import {useEditorExtensions} from './useEditorExtensions';

// ─── Component ───────────────────────────────────────────────────────────────

const Editor = ({
    document,
    settings: settingsProps,
    save,
    layout,
    requests,
    callbacks,
    search,
    editorZoom = 1,
    surfaceCache,
    liveStore: providedLiveStore,
    children,
}: EditorProps & {children?: ReactNode}) => {
    const {
        initialValue,
        collaboration,
        readOnly = false,
        persistentCharacters = [],
        persistentMusic = [],
        commentThreads,
        scriptTitle,
        draftDate,
    } = document;
    const {settings: globalSettings, scriptSettings} = settingsProps ?? {};
    const {onManualSave} = save ?? {};
    const {
        autoFocus,
        leftSidebarToggle,
        rightSidebarToggle,
        sidebarWidth,
    } = layout ?? {};
    const {
        onValueChange,
        onIndexChange,
        onActiveBlockChange,
        onBlockUiEvent,
        onRequestCreateMusic,
        onRequestRemoveMusic,
        onOpenMusicManager,
        onMusicAssigned,
        onMusicUnassigned,
        onRequestDeleteScene,
        onRequestConvertScene,
        onRequestRevealComments,
        isCommentsPanelOpen,
        onCommentAnchorClick,
        onCommentBlocksMerged,
    } = callbacks ?? {};

    const resolvedInitialValue = useMemo(() => coerceUnknownBlocksToStageDirections(initialValue).value, [initialValue]);
    const initialSerialized = useMemo(() => serializeDocumentForSave(resolvedInitialValue), [resolvedInitialValue]);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);

    const runtimeGlobalSettings = useEditorRuntimeSettings(globalSettings);
    const runtimeScriptSettings = useEditorRuntimeSettings(scriptSettings ?? resolvedInitialValue.attrs?.settings);
    const resolvedSettings = useMemo(() => resolveEditorSettings(runtimeGlobalSettings, runtimeScriptSettings), [runtimeGlobalSettings, runtimeScriptSettings]);
    const blockShortcuts = useMemo(() => getBlockShortcuts(resolvedSettings.blocks), [resolvedSettings.blocks]);
    const sceneNumberFormat = resolvedSettings.blocks.scene?.sceneNumberFormat ?? DEFAULT_SCENE_NUMBER_FORMAT;
    const blockNextElements = useMemo(() => getBlockNextElements(resolvedSettings.blocks), [resolvedSettings.blocks]);

    const initialContentSignature = useInitialContentSignature(collaboration, resolvedInitialValue);
    const surfaceSignature = useMemo(
        () => JSON.stringify({
            content: initialContentSignature,
            settings: selectEditorRebuildSettings(resolvedSettings),
            editorZoom,
            blockUi: Boolean(onBlockUiEvent),
        }),
        [
            editorZoom,
            initialContentSignature,
            onBlockUiEvent,
            resolvedSettings,
        ],
    );
    /*
     * The color refs are captured by editor extensions via closure, so a
     * restored cached surface must keep using the bundle its extensions hold.
     * Resolved once per mount, before extensions are built.
     */
    const surfaceRefsRef = useRef<CharacterColorRefsBundle | null>(null);

    if (!surfaceRefsRef.current) {
        surfaceRefsRef.current = surfaceCache?.acquire(surfaceSignature)?.characterColorRefs ?? createCharacterColorRefsBundle();
    }

    const commentCallbacksRef = useCommentCallbacksRef({
        onRequestReveal: onRequestRevealComments,
        isPanelOpen: isCommentsPanelOpen,
        onAnchorClick: onCommentAnchorClick,
        onBlocksMerged: onCommentBlocksMerged,
    });

    const persistentMusicRef = useRef(persistentMusic);

    useEffect(() => {
        persistentMusicRef.current = persistentMusic;
    }, [persistentMusic]);

    const {
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        persistentCharactersRef,
        confirmedCharacterColorsById,
        liveStore,
    } = useEditorCharacterColors({
        persistentCharacters,
        resolvedInitialValue,
        refs: surfaceRefsRef.current,
        liveStore: providedLiveStore,
    });

    const isLeftSidebarOpen = leftSidebarToggle?.isOpen ?? false;
    const isRightSidebarOpen = rightSidebarToggle?.isOpen ?? false;
    const responsiveScale = useResponsiveScale({
        rootRef,
        canvasHostRef,
        pageWidthPx: resolvedSettings.page.widthPx,
        editorZoom,
    });
    const renderScale = useMemo(() => editorZoom * responsiveScale, [editorZoom, responsiveScale]);
    const editorStyle = useMemo(() => getEditorCssVars(resolvedSettings, renderScale, editorZoom), [
        editorZoom,
        renderScale,
        resolvedSettings,
    ]);

    const {
        resolvedLayout,
        handleLeftSidebarToggleMouseDown,
        handleRightSidebarToggleMouseDown,
    } = useEditorSidebarLayout({children, layout});

    const extensions = useEditorExtensions({
        resolvedSettings,
        editorZoom,
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        persistentCharactersRef,
        persistentMusicRef,
        onRequestCreateMusic,
        onRequestRemoveMusic,
        onOpenMusicManager,
        onMusicAssigned,
        onMusicUnassigned,
        onRequestDeleteScene,
        onRequestConvertScene,
        commentCallbacksRef,
        enableBlockUiEvents: Boolean(onBlockUiEvent),
        collaboration,
    });
    const initialDoc = useMemo<ScriptDocument>(() => resolvedInitialValue, [initialContentSignature]);
    const {editor} = useScriptEditorInstance({
        surfaceCache,
        signature: surfaceSignature,
        extensions,
        // Bound editors render the Y.Doc; initial content would be written into it.
        content: collaboration ? undefined : initialDoc,
        characterColorRefs: surfaceRefsRef.current,
    });

    useEffect(() => {
        if (editor && !editor.isDestroyed) {
            editor.commands.setCommentThreads(commentThreads ?? []);
        }
    }, [commentThreads, editor]);

    useEditorCharacterSync(editor, persistentCharacters);

    useEditorReadOnly(editor, readOnly);

    const {
        scheduleAutosave,
        handleManualSave,
        setLatestValue,
        syncInitialValue,
    } = useEditorAutosave(editor, {
        ...save,
        onValueChange,
        scriptSettings,
    });
    const rootStyle = useMemo(
        () => buildEditorRootStyle({
            persistentCharacters,
            editorStyle,
            sidebarWidth,
            pageSpanPx: resolvedSettings.page.widthPx * editorZoom,
            isLeftSidebarOpen,
            isRightSidebarOpen,
        }),
        [
            editorStyle,
            editorZoom,
            isLeftSidebarOpen,
            isRightSidebarOpen,
            persistentCharacters,
            resolvedSettings.page.widthPx,
            sidebarWidth,
        ],
    );

    usePaginationSettings({
        editor,
        resolvedSettings,
        renderScale,
    });

    const isInitialCanvasReady = useInitialCanvasReady(editor);

    const {actCommands} = useEditorLifecycle({
        editor: {
            instance: editor,
            autoFocus,
        },
        liveStore,
        document: {
            initialValue: resolvedInitialValue,
            initialSerialized,
            isCollaborative: Boolean(collaboration),
            setLatestValue,
            syncInitialValue,
            scheduleAutosave,
        },
        save: {
            onManualSave,
            handleManualSave,
        },
        callbacks: {
            onValueChange,
            onIndexChange,
            onActiveBlockChange,
            onBlockUiEvent,
        },
        characters: {
            persistentCharactersRef,
            colorByCharacterIdRef,
            rememberedColorByKeyRef,
        },
        requests,
    });

    return (
        <EditorSnapshotStoreProvider store={liveStore}>
            <EditorInstanceProvider editor={editor}>
                <EditorElementSelectionProvider editor={editor} rootRef={rootRef}>
                    <EditorSceneNumberFormatContext.Provider value={sceneNumberFormat}>
                        <EditorActCommandsProvider value={actCommands}>
                            <EditorShell
                                isCanvasReady={isInitialCanvasReady}
                                canvas={{
                                    autoFocus,
                                    editor,
                                    persistentCharacters,
                                    persistentMusic,
                                    onMusicAssigned,
                                    onOpenMusicManager,
                                    onRequestRemoveMusic,
                                    headerFooter: resolvedSettings.headerFooter,
                                    characterDecoration: resolvedSettings.visual.characterDecoration,
                                    scriptTitle,
                                    draftDate,
                                    blockShortcuts,
                                    blockNextElements,
                                    search,
                                }}
                                layout={resolvedLayout}
                                rootRef={rootRef}
                                canvasHostRef={canvasHostRef}
                                rootStyle={rootStyle}
                                confirmedCharacterColorsById={confirmedCharacterColorsById}
                                onLeftSidebarToggleMouseDown={handleLeftSidebarToggleMouseDown}
                                onRightSidebarToggleMouseDown={handleRightSidebarToggleMouseDown}
                            />
                        </EditorActCommandsProvider>
                    </EditorSceneNumberFormatContext.Provider>
                </EditorElementSelectionProvider>
            </EditorInstanceProvider>
        </EditorSnapshotStoreProvider>
    );
};

Editor.LeftSidebar = LeftSidebar;
Editor.RightSidebar = RightSidebar;

export default Editor;
