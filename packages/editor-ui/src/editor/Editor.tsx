import type {EditorSettingsOverride, ScriptDocument} from '@stagistic/shared';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import {type Editor as TiptapEditor, useEditor} from '@tiptap/react';
import {
    NavArrowLeft,
    NavArrowRight,
} from 'iconoir-react';
import clsx from 'clsx';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {EditorCanvas} from './components/EditorCanvas';
import EditorToolbar from './components/EditorToolbar';
import styles from './Editor.module.css';
import {
    getEditorCssVars,
    resolveEditorSettings,
    stripScriptSettings,
} from './editorSettings';
import {
    createPaginationExtension,
    FountainBlockExtension,
    FountainColumnExtension,
    FountainColumnGroupExtension,
} from './tiptap/extensions';

const DEFAULT_AUTOSAVE_DELAY_MS = 1500;

const serializeValue = (value: ScriptDocument) => JSON.stringify(stripScriptSettings(value));

type SaveResult = boolean | void | Promise<boolean | void>;

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

type EditorProps = {
    initialValue: ScriptDocument,
    onValueChange?: (value: ScriptDocument) => void,
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    autoFocus?: boolean,
    settings?: EditorSettingsOverride,
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
};

const useLatestRef = <T,>(value: T) => {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
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
    leftSidebarToggle,
    rightSidebarToggle,
    leftSidebar,
    rightSidebar,
    sidebarWidth,
}: EditorProps) => {
    const initialSerialized = useMemo(() => serializeValue(initialValue), [initialValue]);
    const sizeScale = useMemo(() => getSizeScale(), []);
    const [responsiveScale, setResponsiveScale] = useState(1);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const resolvedSettings = useMemo(
        () => resolveEditorSettings(settings, initialValue.attrs?.settings),
        [initialSerialized, settings],
    );
    const renderScale = useMemo(() => sizeScale * responsiveScale, [responsiveScale, sizeScale]);
    const editorStyle = useMemo(
        () => getEditorCssVars(resolvedSettings, renderScale),
        [renderScale, resolvedSettings],
    );
    const paginationExtension = useMemo(
        () => createPaginationExtension(resolvedSettings, sizeScale),
        [resolvedSettings, sizeScale],
    );
    const latestValueRef = useRef<ScriptDocument>(initialValue);
    const lastSavedSerializedRef = useRef<string>(initialSerialized);
    const autosaveTimerRef = useRef<number | null>(null);
    const pendingUpdateRef = useRef<number | null>(null);
    const latestEditorRef = useRef<TiptapEditor | null>(null);
    const dirtyRef = useRef(false);
    const isApplyingInitialRef = useRef(false);
    const onValueChangeRef = useLatestRef(onValueChange);
    const onAutoSaveRef = useLatestRef(onAutoSave);
    const onManualSaveRef = useLatestRef(onManualSave);
    const onDirtyChangeRef = useLatestRef(onDirtyChange);
    const isLeftSidebarOpen = leftSidebarToggle?.isOpen ?? false;
    const isRightSidebarOpen = rightSidebarToggle?.isOpen ?? false;
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

    const updateDirty = useCallback((nextDirty: boolean) => {
        if (dirtyRef.current === nextDirty) {
            return;
        }

        dirtyRef.current = nextDirty;
        onDirtyChangeRef.current?.(nextDirty);
    }, [onDirtyChangeRef]);

    const clearAutosaveTimer = useCallback(() => {
        if (!autosaveTimerRef.current) {
            return;
        }

        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
    }, []);

    const scheduleAutosave = useCallback((nextValue: ScriptDocument) => {
        const serialized = serializeValue(nextValue);
        const isDirty = serialized !== lastSavedSerializedRef.current;

        updateDirty(isDirty);

        const autoSaveHandler = onAutoSaveRef.current;

        if (!autoSaveHandler || !isDirty) {
            clearAutosaveTimer();

            return;
        }

        clearAutosaveTimer();

        const delay = autoSaveDelayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;

        autosaveTimerRef.current = window.setTimeout(() => {
            const latestValue = latestValueRef.current;
            const latestSerialized = serializeValue(latestValue);

            if (latestSerialized === lastSavedSerializedRef.current) {
                return;
            }

            const run = async () => {
                try {
                    const result = await autoSaveHandler(latestValue);

                    if (result === false) {
                        return;
                    }

                    lastSavedSerializedRef.current = latestSerialized;
                    updateDirty(false);
                } catch {
                    // onAutoSave should handle reporting errors.
                }
            };

            void run();
        }, delay);
    }, [
        autoSaveDelayMs,
        clearAutosaveTimer,
        onAutoSaveRef,
        updateDirty,
    ]);

    const handleManualSave = useCallback(async () => {
        const manualSaveHandler = onManualSaveRef.current;

        if (!manualSaveHandler) {
            return;
        }

        clearAutosaveTimer();

        const currentValue = latestValueRef.current;
        const serialized = serializeValue(currentValue);

        if (serialized === lastSavedSerializedRef.current) {
            return;
        }

        try {
            const result = await manualSaveHandler(currentValue);

            if (result === false) {
                return;
            }

            lastSavedSerializedRef.current = serialized;
            updateDirty(false);
        } catch {
            // onManualSave should handle reporting errors.
        }
    }, [
        clearAutosaveTimer,
        onManualSaveRef,
        updateDirty,
    ]);

    const initialDoc = useMemo<ScriptDocument>(
        () => initialValue,
        // Use stable JSON string for content comparison to prevent unnecessary editor re-creation
        [JSON.stringify(stripScriptSettings(initialValue))],
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
            FountainBlockExtension,
        ],
        content: initialDoc,
        autofocus: autoFocus ? 'start' : false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                'data-fountain-editor': 'true',
            },
        },
    }, [initialDoc, paginationExtension]);

    useEffect(() => {
        const rootElement = rootRef.current;
        const canvasHostElement = canvasHostRef.current;

        if (!rootElement || !canvasHostElement) {
            return;
        }

        const pageWidthPx = resolvedSettings.page.widthPx * sizeScale;

        if (!Number.isFinite(pageWidthPx) || pageWidthPx <= 0) {
            setResponsiveScale(1);

            return;
        }

        const updateScale = () => {
            const availableWidth = Math.max(0, canvasHostElement.clientWidth);
            const nextScale = Math.min(1, availableWidth / pageWidthPx);

            setResponsiveScale(prev => {
                if (Math.abs(prev - nextScale) < 0.001) {
                    return prev;
                }

                return nextScale;
            });
        };

        updateScale();

        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateScale);

            return () => {
                window.removeEventListener('resize', updateScale);
            };
        }

        const observer = new ResizeObserver(() => {
            updateScale();
        });

        observer.observe(rootElement);
        observer.observe(canvasHostElement);

        return () => {
            observer.disconnect();
        };
    }, [
        isLeftSidebarOpen,
        isRightSidebarOpen,
        resolvedSettings.page.widthPx,
        sizeScale,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const {page, typography} = resolvedSettings;
        const scaleValue = (value: number) => value * renderScale;
        const lineHeightPx = scaleValue(typography.fontSizePx * typography.lineHeight);

        // Cast to access the custom command from the pagination extension
        const commands = editor.commands as {
            updatePaginationSettings?: (settings: {
                pageHeight: number,
                pageWidth: number,
                marginTop: number,
                marginBottom: number,
                marginLeft: number,
                marginRight: number,
                lineHeightPx: number,
                dividerColor: string,
                dividerThickness: number,
            }) => boolean,
        };

        commands.updatePaginationSettings?.({
            pageHeight: scaleValue(page.heightPx),
            pageWidth: scaleValue(page.widthPx),
            marginTop: scaleValue(page.marginTopPx),
            marginBottom: scaleValue(page.marginBottomPx),
            marginLeft: scaleValue(page.marginLeftPx),
            marginRight: scaleValue(page.marginRightPx),
            lineHeightPx,
            dividerColor: 'var(--color-divider)',
            dividerThickness: 1,
        });
    }, [
        editor,
        renderScale,
        resolvedSettings,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        latestEditorRef.current = editor;

        const handleUpdate = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            if (isApplyingInitialRef.current) {
                return;
            }

            latestEditorRef.current = updatedEditor;

            if (pendingUpdateRef.current !== null) {
                return;
            }

            pendingUpdateRef.current = window.requestAnimationFrame(() => {
                pendingUpdateRef.current = null;

                const activeEditor = latestEditorRef.current;

                if (!activeEditor || isApplyingInitialRef.current) {
                    return;
                }

                const nextValue = stripScriptSettings(activeEditor.getJSON() as ScriptDocument);

                latestValueRef.current = nextValue;
                onValueChangeRef.current?.(nextValue);
                scheduleAutosave(nextValue);
            });
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (pendingUpdateRef.current !== null) {
                window.cancelAnimationFrame(pendingUpdateRef.current);
                pendingUpdateRef.current = null;
            }
        };
    }, [
        editor,
        onValueChangeRef,
        scheduleAutosave,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        isApplyingInitialRef.current = true;
        editor.commands.setContent(initialValue, {emitUpdate: false});
        isApplyingInitialRef.current = false;

        latestValueRef.current = stripScriptSettings(initialValue);
        lastSavedSerializedRef.current = initialSerialized;
        updateDirty(false);
        clearAutosaveTimer();
    }, [
        clearAutosaveTimer,
        editor,
        initialSerialized,
        initialValue,
        updateDirty,
    ]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        if (!autoFocus) {
            return;
        }

        editor.commands.focus('start');
    }, [autoFocus, editor]);

    useEffect(() => {
        if (!onManualSave) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                void handleManualSave();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleManualSave, onManualSave]);

    useEffect(() => {
        return () => {
            clearAutosaveTimer();
        };
    }, [clearAutosaveTimer]);

    const handleLeftSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        leftSidebarToggle?.onToggle();
    }, [leftSidebarToggle]);

    const handleRightSidebarToggleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        rightSidebarToggle?.onToggle();
    }, [rightSidebarToggle]);

    return (
        <div
            className={styles.root}
            ref={rootRef}
            style={rootStyle}
        >
            <div className={styles.toolbarRow}>
                <div className={styles.toolbarSideLeft}>
                    {leftSidebarToggle && (
                        <button
                            className={styles.sidebarToggleButton}
                            type="button"
                            aria-label={isLeftSidebarOpen ? 'Hide left sidebar' : 'Show left sidebar'}
                            aria-pressed={isLeftSidebarOpen}
                            onMouseDown={handleLeftSidebarToggleMouseDown}
                        >
                            <NavArrowLeft
                                aria-hidden="true"
                                className={clsx(
                                    styles.sidebarToggleIcon,
                                    !isLeftSidebarOpen && styles.sidebarToggleIconFlipped,
                                )}
                            />
                        </button>
                    )}
                </div>
                <div className={styles.toolbarCenter}>
                    <div className={styles.toolbarCenterInner}>
                        <EditorToolbar editor={editor} />
                    </div>
                </div>
                <div className={styles.toolbarSideRight}>
                    {rightSidebarToggle && (
                        <button
                            className={styles.sidebarToggleButton}
                            type="button"
                            aria-label={isRightSidebarOpen ? 'Hide right sidebar' : 'Show right sidebar'}
                            aria-pressed={isRightSidebarOpen}
                            onMouseDown={handleRightSidebarToggleMouseDown}
                        >
                            <NavArrowRight
                                aria-hidden="true"
                                className={clsx(
                                    styles.sidebarToggleIcon,
                                    !isRightSidebarOpen && styles.sidebarToggleIconFlipped,
                                )}
                            />
                        </button>
                    )}
                </div>
            </div>
            <div className={styles.contentRow}>
                <aside
                    className={isLeftSidebarOpen ? styles.sidebarLeftOpen : styles.sidebarLeftHidden}
                    aria-hidden={!isLeftSidebarOpen}
                >
                    {leftSidebar}
                </aside>
                <div
                    className={styles.canvasHost}
                    ref={canvasHostRef}
                >
                    <EditorCanvas
                        editor={editor}
                        autoFocus={autoFocus}
                    />
                </div>
                <aside
                    className={isRightSidebarOpen ? styles.sidebarRightOpen : styles.sidebarRightHidden}
                    aria-hidden={!isRightSidebarOpen}
                >
                    {rightSidebar}
                </aside>
            </div>
        </div>
    );
};

export default Editor;
