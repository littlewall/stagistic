import {
    coerceUnknownBlocksToStageDirections,
    DEFAULT_SCENE_NUMBER_FORMAT,
} from '@stagistic/script';
import {
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {buildEditorRootStyle} from './buildRootStyle';
import {EditorShell} from './components/editorShell/EditorShell';
import type {EditorProps} from './contracts';
import {EditorProviders} from './EditorProviders';
import {
    getEditorCssVars,
    resolveEditorSettings,
    selectEditorRebuildSettings,
    stripScriptSettings,
} from './editorSettings';
import {useEditorRuntimeSettings} from './editorSettings/useEditorRuntimeSettings';
import {LeftSidebar, RightSidebar} from './editorSlots';
import {serializeDocumentForSave} from './hooks/useAutosaveController';
import {useCommentCallbacksRef} from './hooks/useCommentCallbacksRef';
import {useEditorAutosave} from './hooks/useEditorAutosave';
import {useEditorCharacterColors} from './hooks/useEditorCharacterColors';
import {useEditorCharacterSync} from './hooks/useEditorCharacterSync';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {useEditorSidebarLayout} from './hooks/useEditorSidebarLayout';
import {useInitialEditorContent} from './hooks/useInitialEditorContent';
import {useInitialCanvasReady} from './hooks/usePaginationReady';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import {getBlockNextElements, getBlockShortcuts} from './model/blockSettingMaps';
import {
    getSessionManualSave,
    getSessionSaveOptions,
    getSessionSurfaceOptions,
    useSessionDirty,
} from './session/editorSessionOptions';
import {useScriptEditorInstance} from './surface/useScriptEditorInstance';
import {useSurfaceCharacterRefs} from './surface/useSurfaceCharacterRefs';
import {useEditorExtensions} from './useEditorExtensions';

// ─── Component ───────────────────────────────────────────────────────────────

const Editor = ({
    document,
    session,
    settings: settingsProps,
    save,
    layout,
    requests,
    callbacks,
    search,
    editorZoom = 1,
    surfaceCache,
    liveStore: providedLiveStore,
    isReadOnly = false,
    readOnlyLabel = null,
    children,
}: EditorProps & {children?: ReactNode}) => {
    const {
        initialValue,
        persistentCharacters = [],
        persistentMusic = [],
        commentThreads,
        scriptTitle,
        draftDate,
    } = document;
    const {settings: globalSettings, scriptSettings} = settingsProps ?? {};
    const {onManualSave} = save ?? {};
    const sessionDirty = useSessionDirty(session);
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

    useEffect(() => session?.bindCallbacks(callbacks ?? {}), [session, callbacks]);

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

    const initialContentSignature = useMemo(() => JSON.stringify(stripScriptSettings(resolvedInitialValue)), [resolvedInitialValue]);
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
    const sessionSurface = getSessionSurfaceOptions(session, surfaceCache, surfaceSignature);
    const surfaceRefs = useSurfaceCharacterRefs(sessionSurface.surfaceCache, sessionSurface.signature);

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
        refs: surfaceRefs,
        liveStore: providedLiveStore,
        initializeLiveStore: !session,
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
        isReadOnly,
    });
    const initialDoc = useInitialEditorContent(initialContentSignature, resolvedInitialValue);
    const {editor} = useScriptEditorInstance({
        ...sessionSurface,
        extensions,
        content: initialDoc,
        characterColorRefs: surfaceRefs,
        isReadOnly,
    });

    useEffect(() => {
        if (editor && !editor.isDestroyed) {
            editor.commands.setCommentThreads(commentThreads ?? []);
        }
    }, [commentThreads, editor]);

    useEditorCharacterSync(session ? null : editor, persistentCharacters);

    const {
        scheduleAutosave,
        handleManualSave,
        setLatestValue,
        syncInitialValue,
    } = useEditorAutosave(editor, {
        ...getSessionSaveOptions(session, save),
        externalDirty: session ? sessionDirty : undefined,
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
            sessionOwned: Boolean(session),
        },
        liveStore,
        document: {
            initialValue: resolvedInitialValue,
            initialSerialized,
            setLatestValue,
            syncInitialValue,
            scheduleAutosave,
        },
        save: {
            onManualSave,
            handleManualSave: getSessionManualSave(session, onManualSave, handleManualSave, scriptSettings),
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
        <EditorProviders editor={editor} rootRef={rootRef} liveStore={liveStore} sceneNumberFormat={sceneNumberFormat} actCommands={actCommands}>
            <EditorShell
                isCanvasReady={isInitialCanvasReady}
                isReadOnly={isReadOnly}
                readOnlyLabel={readOnlyLabel}
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
        </EditorProviders>
    );
};

Editor.LeftSidebar = LeftSidebar;
Editor.RightSidebar = RightSidebar;

export default Editor;
