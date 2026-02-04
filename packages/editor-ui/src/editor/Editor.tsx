import type {ScriptDocument} from '@stagistic/shared';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';
import {type Editor as TiptapEditor, useEditor} from '@tiptap/react';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {EditorCanvas} from './components/EditorCanvas';
import EditorToolbar from './components/EditorToolbar';
import styles from './Editor.module.css';
import FountainBlockExtension from './tiptap/FountainBlockExtension';
import {
    FountainColumnExtension,
    FountainColumnGroupExtension,
} from './tiptap/FountainColumnExtensions';

const DEFAULT_AUTOSAVE_DELAY_MS = 1500;

const serializeValue = (value: ScriptDocument) => JSON.stringify(value);

type SaveResult = boolean | void | Promise<boolean | void>;

type EditorProps = {
    initialValue: ScriptDocument,
    onValueChange?: (value: ScriptDocument) => void,
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    autoFocus?: boolean,
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
}: EditorProps) => {
    const initialSerialized = useMemo(() => serializeValue(initialValue), [initialValue]);
    const latestValueRef = useRef<ScriptDocument>(initialValue);
    const lastSavedSerializedRef = useRef<string>(initialSerialized);
    const autosaveTimerRef = useRef<number | null>(null);
    const dirtyRef = useRef(false);
    const isApplyingInitialRef = useRef(false);
    const onValueChangeRef = useLatestRef(onValueChange);
    const onAutoSaveRef = useLatestRef(onAutoSave);
    const onManualSaveRef = useLatestRef(onManualSave);
    const onDirtyChangeRef = useLatestRef(onDirtyChange);

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
        [initialSerialized],
    );

    const editor = useEditor({
        extensions: [
            Document,
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
    }, [initialDoc]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = ({editor: updatedEditor}: {editor: TiptapEditor}) => {
            if (isApplyingInitialRef.current) {
                return;
            }

            const nextValue = updatedEditor.getJSON() as ScriptDocument;

            latestValueRef.current = nextValue;
            onValueChangeRef.current?.(nextValue);
            scheduleAutosave(nextValue);
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
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

        latestValueRef.current = initialValue;
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

    return (
        <div className={styles.root}>
            <EditorToolbar editor={editor} />
            <EditorCanvas editor={editor} autoFocus={autoFocus} />
        </div>
    );
};

export default Editor;
