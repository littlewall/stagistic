import {
    coerceUnknownBlocksToStageDirections,
    type ScriptDocument,
} from '@stagistic/script';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
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
    stripScriptSettings,
} from './editorSettings';
import {useEditorRuntimeSettings} from './editorSettings/useEditorRuntimeSettings';
import {LeftSidebar, RightSidebar} from './editorSlots';
import {EditorElementSelectionProvider} from './elementSelection/context';
import {
    serializeDocumentForSave,
    useAutosaveController,
} from './hooks/useAutosaveController';
import {useEditorCharacterColors} from './hooks/useEditorCharacterColors';
import {useEditorCharacterSync} from './hooks/useEditorCharacterSync';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {useEditorSidebarLayout} from './hooks/useEditorSidebarLayout';
import {usePaginationReady} from './hooks/usePaginationReady';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import {EditorSnapshotStoreProvider} from './live/context';
import {
    type CharacterColorRefsBundle,
    createCharacterColorRefsBundle,
} from './surface/editorSurfaceCache';
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
    surfaceCache,
    liveStore: providedLiveStore,
    children,
}: EditorProps & {children?: ReactNode}) => {
    const {
        initialValue,
        persistentCharacters = [],
        persistentCues = [],
        scriptTitle,
        draftDate,
    } = document;
    const {
        settings: globalSettings,
        scriptSettings,
    } = settingsProps ?? {};
    const {
        onAutoSave,
        onManualSave,
        onDirtyChange,
        autoSaveDelayMs,
    } = save ?? {};
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
        onRequestCreateCue,
        onRequestRemoveCue,
        onOpenCueManager,
        onCueAssigned,
        onCueUnassigned,
    } = callbacks ?? {};

    const resolvedInitialValue = useMemo(
        () => coerceUnknownBlocksToStageDirections(initialValue).value,
        [initialValue],
    );
    const initialSerialized = useMemo(
        () => serializeDocumentForSave(resolvedInitialValue),
        [resolvedInitialValue],
    );
    const sizeScale = useMemo(() => {
        if (typeof window === 'undefined') {
            return 1;
        }

        const raw = window
            .getComputedStyle(window.document.documentElement)
            .getPropertyValue('--size-scale');
        const parsed = Number.parseFloat(raw);

        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }, []);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);

    const runtimeGlobalSettings = useEditorRuntimeSettings(globalSettings);
    const runtimeScriptSettings = useEditorRuntimeSettings(
        scriptSettings ?? resolvedInitialValue.attrs?.settings,
    );
    const resolvedSettings = useMemo(
        () => resolveEditorSettings(runtimeGlobalSettings, runtimeScriptSettings),
        [runtimeGlobalSettings, runtimeScriptSettings],
    );

    const initialContentSignature = useMemo(
        () => JSON.stringify(stripScriptSettings(resolvedInitialValue)),
        [resolvedInitialValue],
    );
    const surfaceSignature = useMemo(() => JSON.stringify({
        content: initialContentSignature,
        settings: selectEditorRebuildSettings(resolvedSettings),
        sizeScale,
        blockUi: Boolean(onBlockUiEvent),
    }), [
        initialContentSignature,
        onBlockUiEvent,
        resolvedSettings,
        sizeScale,
    ]);
    /*
     * The color refs are captured by editor extensions via closure, so a
     * restored cached surface must keep using the bundle its extensions hold.
     * Resolved once per mount, before extensions are built.
     */
    const surfaceRefsRef = useRef<CharacterColorRefsBundle | null>(null);

    if (!surfaceRefsRef.current) {
        surfaceRefsRef.current = surfaceCache?.acquire(surfaceSignature)?.characterColorRefs
            ?? createCharacterColorRefsBundle();
    }

    const persistentCuesRef = useRef(persistentCues);

    useEffect(() => {
        persistentCuesRef.current = persistentCues;
    }, [persistentCues]);

    const {
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        persistentCharactersRef,
        confirmedCharacterColorsById,
        liveStore,
    } = useEditorCharacterColors({
        persistentCharacters,
        characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
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
        sizeScale,
    });
    const renderScale = useMemo(() => sizeScale * responsiveScale, [responsiveScale, sizeScale]);
    const editorStyle = useMemo(
        () => getEditorCssVars(resolvedSettings, renderScale),
        [renderScale, resolvedSettings],
    );

    const {
        resolvedLayout, handleLeftSidebarToggleMouseDown, handleRightSidebarToggleMouseDown,
    } =
        useEditorSidebarLayout({children, layout});

    const extensions = useEditorExtensions({
        resolvedSettings,
        sizeScale,
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        persistentCharactersRef,
        persistentCuesRef,
        onRequestCreateCue,
        onRequestRemoveCue,
        onOpenCueManager,
        onCueAssigned,
        onCueUnassigned,
        enableBlockUiEvents: Boolean(onBlockUiEvent),
    });
    const initialDoc = useMemo<ScriptDocument>(
        () => resolvedInitialValue,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [initialContentSignature],
    );
    const {editor} = useScriptEditorInstance({
        surfaceCache,
        signature: surfaceSignature,
        extensions,
        content: initialDoc,
        autoFocus,
        characterColorRefs: surfaceRefsRef.current,
    });

    useEditorCharacterSync(
        editor,
        persistentCharacters,
        resolvedSettings.visual.characterColorSaturation,
    );

    const resolveLatestValue = useCallback(() => {
        if (!editor) {
            return null;
        }

        const paginationCommands = editor.commands as {
            forcePaginationRecalc?: () => boolean,
        };

        paginationCommands.forcePaginationRecalc?.();

        return stripScriptSettings(editor.getJSON() as ScriptDocument);
    }, [editor]);
    const {
        scheduleAutosave,
        handleManualSave,
        setLatestValue,
        syncInitialValue,
    } = useAutosaveController({
        onAutoSave,
        onManualSave,
        onDirtyChange,
        autoSaveDelayMs,
        resolveLatestValue,
        onValueSynced: (value, revision) => {
            onValueChange?.(value, {source: 'typing', revision});
        },
    });
    const rootStyle = useMemo(() => buildEditorRootStyle({
        persistentCharacters,
        editorStyle,
        sidebarWidth,
        isLeftSidebarOpen,
        isRightSidebarOpen,
    }), [
        editorStyle,
        isLeftSidebarOpen,
        isRightSidebarOpen,
        persistentCharacters,
        sidebarWidth,
    ]);

    usePaginationSettings({
        editor,
        resolvedSettings,
        renderScale,
    });

    const isPaginationReady = usePaginationReady(editor);
    const [hasPresentedCanvas, setHasPresentedCanvas] = useState(isPaginationReady);

    useLayoutEffect(() => {
        if (isPaginationReady) {
            setHasPresentedCanvas(true);
        }
    }, [isPaginationReady]);

    const isInitialCanvasReady = hasPresentedCanvas || isPaginationReady;

    const {actCommands} = useEditorLifecycle({
        editor: {
            instance: editor,
            autoFocus,
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
            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
        },
        requests,
    });

    return (
        <EditorSnapshotStoreProvider store={liveStore}>
            <EditorInstanceProvider editor={editor}>
                <EditorElementSelectionProvider editor={editor} rootRef={rootRef}>
                    <EditorActCommandsProvider value={actCommands}>
                        <EditorShell
                            isCanvasReady={isInitialCanvasReady}
                            canvas={{
                                autoFocus,
                                characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
                                editor,
                                persistentCharacters,
                                persistentCues,
                                onCueAssigned,
                                headerFooter: resolvedSettings.headerFooter,
                                scriptTitle,
                                draftDate,
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
                </EditorElementSelectionProvider>
            </EditorInstanceProvider>
        </EditorSnapshotStoreProvider>
    );
};

Editor.LeftSidebar = LeftSidebar;
Editor.RightSidebar = RightSidebar;

export default Editor;
