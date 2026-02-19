import {type ScriptDocument} from '@stagistic/script-core';
import {useEditor} from '@tiptap/react';
import {
    type MouseEvent as ReactMouseEvent, useCallback, useMemo, useRef,
} from 'react';

import {buildEditorRootStyle} from './buildRootStyle';
import {EditorShell} from './components/editorShell/EditorShell';
import {
    getEditorCssVars,
    resolveEditorSettings,
    stripScriptSettings,
} from './editorSettings';
import {
    serializeDocumentForSave,
    useAutosaveController,
} from './hooks/useAutosaveController';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import type {EditorProps} from './types';
import {useEditorExtensions} from './useEditorExtensions';

const getSizeScale = () => {
    if (typeof window === 'undefined') {
        return 1;
    }

    const raw = window
        .getComputedStyle(document.documentElement)
        .getPropertyValue('--size-scale');
    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const Editor = ({
    initialValue,
    onValueChange,
    onAutoSave,
    onManualSave,
    onDirtyChange,
    autoSaveDelayMs,
    autoFocus,
    settings,
    scriptSettings,
    leftSidebarToggle,
    rightSidebarToggle,
    leftSidebar,
    rightSidebar,
    sidebarWidth,
    persistentCharacters = [],
    focusBlockRequest,
    insertActRequest,
    renameActRequest,
    deleteActRequest,
    moveSceneRequest,
    moveActRequest,
    onActiveBlockChange,
}: EditorProps) => {
    const initialSerialized = useMemo(() => serializeDocumentForSave(initialValue), [initialValue]);
    const sizeScale = useMemo(() => getSizeScale(), []);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const resolvedSettings = useMemo(() => {
        const effectiveScriptSettings = scriptSettings ?? initialValue.attrs?.settings;

        return resolveEditorSettings(settings, effectiveScriptSettings);
    }, [
        initialValue.attrs?.settings,
        scriptSettings,
        settings,
    ]);
    const isLeftSidebarOpen = leftSidebarToggle?.isOpen ?? false;
    const isRightSidebarOpen = rightSidebarToggle?.isOpen ?? false;
    const responsiveScale = useResponsiveScale({
        rootRef,
        canvasHostRef,
        pageWidthPx: resolvedSettings.page.widthPx,
        sizeScale,
        isLeftSidebarOpen,
        isRightSidebarOpen,
    });
    const renderScale = useMemo(() => sizeScale * responsiveScale, [responsiveScale, sizeScale]);
    const editorStyle = useMemo(
        () => getEditorCssVars(resolvedSettings, renderScale),
        [renderScale, resolvedSettings],
    );
    const extensions = useEditorExtensions({
        resolvedSettings,
        sizeScale,
    });
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
    const initialContentSignature = useMemo(
        () => JSON.stringify(stripScriptSettings(initialValue)),
        [initialValue],
    );

    const initialDoc = useMemo<ScriptDocument>(
        () => initialValue,
        [initialContentSignature],
    );

    const editor = useEditor({
        extensions,
        content: initialDoc,
        autofocus: autoFocus ? 'start' : false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                'data-fountain-editor': 'true',
            },
        },
    }, [extensions, initialDoc]);

    usePaginationSettings({
        editor,
        resolvedSettings,
        renderScale,
    });

    useEditorLifecycle({
        editor,
        initialValue,
        initialSerialized,
        autoFocus,
        onManualSave,
        onValueChange,
        setLatestValue,
        syncInitialValue,
        scheduleAutosave,
        handleManualSave,
        focusBlockRequest,
        insertActRequest,
        renameActRequest,
        deleteActRequest,
        moveSceneRequest,
        moveActRequest,
        onActiveBlockChange,
    });

    const handleLeftSidebarToggle = leftSidebarToggle?.onToggle;
    const handleRightSidebarToggle = rightSidebarToggle?.onToggle;

    const handleLeftSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        handleLeftSidebarToggle?.();
    }, [handleLeftSidebarToggle]);

    const handleRightSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        handleRightSidebarToggle?.();
    }, [handleRightSidebarToggle]);

    return (
        <EditorShell
            editor={editor}
            rootRef={rootRef}
            canvasHostRef={canvasHostRef}
            rootStyle={rootStyle}
            autoFocus={autoFocus}
            persistentCharacters={persistentCharacters}
            characterColorSaturation={resolvedSettings.visual.characterColorSaturation}
            leftSidebarToggle={leftSidebarToggle}
            rightSidebarToggle={rightSidebarToggle}
            leftSidebar={leftSidebar}
            rightSidebar={rightSidebar}
            onLeftSidebarToggleMouseDown={handleLeftSidebarToggleMouseDown}
            onRightSidebarToggleMouseDown={handleRightSidebarToggleMouseDown}
        />
    );
};

export default Editor;
