import {
    type EditorSettingsOverride,
    type ScriptDocument,
} from '@stagistic/script-core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import {useEditor} from '@tiptap/react';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useCallback,
    useMemo,
    useRef,
} from 'react';

import {EditorShell} from './components/editorShell/EditorShell';
import {
    getEditorCssVars,
    resolveEditorSettings,
    stripScriptSettings,
} from './editorSettings';
import {
    type SaveResult,
    serializeDocumentForSave,
    useAutosaveController,
} from './hooks/useAutosaveController';
import {useEditorLifecycle} from './hooks/useEditorLifecycle';
import {usePaginationSettings} from './hooks/usePaginationSettings';
import {useResponsiveScale} from './hooks/useResponsiveScale';
import {
    getBlockCasing,
    getBlockNextElements,
    getBlockShortcuts,
} from './model/blockSettingMaps';
import {
    createPaginationExtension,
    FountainBlockExtension,
    FountainColumnExtension,
    FountainColumnGroupExtension,
} from './tiptap/extensions';

const DocumentWithSettings = Document.extend({
    addAttributes() {
        return {
            settings: {
                default: null,
            },
        };
    },
});

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

type PersistentCharacterRef = {
    id: string,
    key: string,
};

type EditorProps = {
    initialValue: ScriptDocument,
    onValueChange?: (value: ScriptDocument) => void,
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    autoFocus?: boolean,
    settings?: EditorSettingsOverride,
    scriptSettings?: EditorSettingsOverride,
    leftSidebarToggle?: {
        isOpen: boolean,
        onToggle: () => void,
    },
    rightSidebarToggle?: {
        isOpen: boolean,
        onToggle: () => void,
    },
    leftSidebar?: ReactNode,
    rightSidebar?: ReactNode,
    sidebarWidth?: string,
    persistentCharacters?: readonly PersistentCharacterRef[],
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
    const paginationExtension = useMemo(
        () => createPaginationExtension(resolvedSettings, sizeScale),
        [resolvedSettings, sizeScale],
    );
    const blockShortcuts = useMemo(
        () => getBlockShortcuts(resolvedSettings),
        [resolvedSettings],
    );
    const blockNextElements = useMemo(
        () => getBlockNextElements(resolvedSettings),
        [resolvedSettings],
    );
    const blockCasing = useMemo(
        () => getBlockCasing(resolvedSettings),
        [resolvedSettings],
    );
    const fountainBlockExtension = useMemo(
        () => FountainBlockExtension.configure({
            blockShortcuts,
            blockNextElements,
            blockCasing,
        }),
        [
            blockCasing,
            blockNextElements,
            blockShortcuts,
        ],
    );
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
    const rootStyle = useMemo(() => ({
        ...editorStyle,
        '--editor-sidebar-width': sidebarWidth ?? 'calc(280px * var(--size-scale))',
        '--toolbar-toggle-width': 'calc(calc(26px * var(--size-scale)) + (var(--space-3) * 2))',
        '--left-toolbar-size': isLeftSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
        '--right-toolbar-size': isRightSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
        '--left-toolbar-divider-opacity': isLeftSidebarOpen ? '1' : '0',
        '--right-toolbar-divider-opacity': isRightSidebarOpen ? '1' : '0',
        '--left-sidebar-size': isLeftSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
        '--right-sidebar-size': isRightSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
    }) as CSSProperties, [
        editorStyle,
        isLeftSidebarOpen,
        isRightSidebarOpen,
        sidebarWidth,
    ]);
    const initialContentSignature = useMemo(
        () => JSON.stringify(stripScriptSettings(initialValue)),
        [initialValue],
    );

    const initialDoc = useMemo<ScriptDocument>(
        () => initialValue,
        // Use stable JSON string for content comparison to prevent unnecessary editor re-creation
        [initialContentSignature],
    );

    const editor = useEditor({
        extensions: [
            DocumentWithSettings,
            paginationExtension,
            Text,
            History,
            Bold,
            Italic,
            Underline,
            FountainColumnGroupExtension,
            FountainColumnExtension,
            fountainBlockExtension,
        ],
        content: initialDoc,
        autofocus: autoFocus ? 'start' : false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                'data-fountain-editor': 'true',
            },
        },
    }, [
        fountainBlockExtension,
        initialDoc,
        paginationExtension,
    ]);

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
