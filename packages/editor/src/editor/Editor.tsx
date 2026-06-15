import {
    coerceUnknownBlocksToStageDirections,
    type ScriptDocument,
} from '@stagistic/script';
import {useEditor} from '@tiptap/react';
import {
    type ReactNode,
    useCallback,
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
    stripScriptSettings,
} from './editorSettings';
import {LeftSidebar, RightSidebar} from './editorSlots';
import {
    serializeDocumentForSave,
    useAutosaveController,
} from './hooks/useAutosaveController';
import {useEditorCharacterColors} from './hooks/useEditorCharacterColors';
import {useEditorCharacterSync} from './hooks/useEditorCharacterSync';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {useEditorSidebarLayout} from './hooks/useEditorSidebarLayout';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import {EditorSnapshotStoreProvider} from './live/context';
import {useEditorExtensions} from './useEditorExtensions';

// ─── Component ───────────────────────────────────────────────────────────────

const Editor = ({
    document,
    settings: settingsProps,
    save,
    layout,
    requests,
    callbacks,
    children,
}: EditorProps & {children?: ReactNode}) => {
    const {
        initialValue,
        persistentCharacters = [],
    } = document;
    const {
        settings,
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

    const resolvedSettings = useMemo(() => {
        const effectiveScriptSettings = scriptSettings ?? resolvedInitialValue.attrs?.settings;

        return resolveEditorSettings(settings, effectiveScriptSettings);
    }, [
        resolvedInitialValue.attrs?.settings,
        scriptSettings,
        settings,
    ]);

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
        enableBlockUiEvents: Boolean(onBlockUiEvent),
    });
    const initialContentSignature = useMemo(
        () => JSON.stringify(stripScriptSettings(resolvedInitialValue)),
        [resolvedInitialValue],
    );

    const initialDoc = useMemo<ScriptDocument>(
        () => resolvedInitialValue,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [initialContentSignature],
    );
    const editor = useEditor({
        extensions,
        content: initialDoc,
        autofocus: autoFocus ? 'start' : false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                'data-editor': 'true',
            },
        },
    }, [extensions, initialDoc]);

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
                <EditorActCommandsProvider value={actCommands}>
                    <EditorShell
                        canvas={{
                            autoFocus,
                            characterColorSaturation: resolvedSettings.visual.characterColorSaturation,
                            editor,
                            persistentCharacters,
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
            </EditorInstanceProvider>
        </EditorSnapshotStoreProvider>
    );
};

Editor.LeftSidebar = LeftSidebar;
Editor.RightSidebar = RightSidebar;

export default Editor;
