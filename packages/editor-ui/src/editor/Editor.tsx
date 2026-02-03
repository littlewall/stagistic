import {
    type SlateValue,
} from '@stagistic/shared';
import {type Value} from 'platejs';
import {
    Plate,
    useEditorValue,
    usePlateEditor,
    useValueVersion,
} from 'platejs/react';
import {
    type MutableRefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import {EditorCanvas} from './components/EditorCanvas';
import EditorToolbar from './components/EditorToolbar';
import styles from './Editor.module.css';
import {createFountainPlugins} from './plugins/fountainPlugin';
import {EditorStateProvider} from './state/EditorStateProvider';
import {FountainLeaf} from './utils/fountainMarks';

const DEFAULT_AUTOSAVE_DELAY_MS = 1500;

const serializeValue = (value: SlateValue) => JSON.stringify(value);

type SaveResult = boolean | void | Promise<boolean | void>;

type EditorProps = {
    initialValue: SlateValue,
    onValueChange?: (value: SlateValue) => void,
    onAutoSave?: (value: SlateValue) => SaveResult,
    onManualSave?: (value: SlateValue) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    autoFocus?: boolean,
};

type EditorAutosaveProps = {
    autoSaveDelayMs?: number,
    initialValue: SlateValue,
    manualSaveRef: MutableRefObject<(() => void) | null>,
    onAutoSave?: (value: SlateValue) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    onManualSave?: (value: SlateValue) => SaveResult,
    onValueChange?: (value: SlateValue) => void,
};

const EditorAutosave = ({
    autoSaveDelayMs,
    initialValue,
    manualSaveRef,
    onAutoSave,
    onDirtyChange,
    onManualSave,
    onValueChange,
}: EditorAutosaveProps) => {
    const editorValue = useEditorValue() as SlateValue | undefined;
    const valueVersion = useValueVersion();
    const latestValueRef = useRef<Value>(initialValue as Value);
    const lastSavedSerializedRef = useRef<string>(serializeValue(initialValue));
    const autosaveTimerRef = useRef<number | null>(null);
    const dirtyRef = useRef(false);

    const updateDirty = useCallback((nextDirty: boolean) => {
        if (dirtyRef.current === nextDirty) {
            return;
        }

        dirtyRef.current = nextDirty;
        onDirtyChange?.(nextDirty);
    }, [onDirtyChange]);

    const clearAutosaveTimer = useCallback(() => {
        if (!autosaveTimerRef.current) {
            return;
        }

        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
    }, []);

    const handleManualSave = useCallback(async () => {
        if (!onManualSave) {
            return;
        }

        clearAutosaveTimer();

        const currentValue = latestValueRef.current as SlateValue;
        const serialized = serializeValue(currentValue);

        if (serialized === lastSavedSerializedRef.current) {
            return;
        }

        try {
            const result = await onManualSave(currentValue);

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
        onManualSave,
        updateDirty,
    ]);

    useEffect(() => {
        manualSaveRef.current = onManualSave ? handleManualSave : null;

        return () => {
            if (manualSaveRef.current === handleManualSave) {
                manualSaveRef.current = null;
            }
        };
    }, [
        handleManualSave,
        manualSaveRef,
        onManualSave,
    ]);

    useEffect(() => {
        const serialized = serializeValue(initialValue);

        latestValueRef.current = initialValue as Value;
        lastSavedSerializedRef.current = serialized;
        updateDirty(false);
        clearAutosaveTimer();
    }, [
        clearAutosaveTimer,
        initialValue,
        updateDirty,
    ]);

    useEffect(() => {
        if (!editorValue) {
            return;
        }

        latestValueRef.current = editorValue as Value;
        onValueChange?.(editorValue);

        const serialized = serializeValue(editorValue);
        const isDirty = serialized !== lastSavedSerializedRef.current;

        updateDirty(isDirty);

        if (!onAutoSave || !isDirty) {
            clearAutosaveTimer();

            return;
        }

        clearAutosaveTimer();

        const delay = autoSaveDelayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;

        autosaveTimerRef.current = window.setTimeout(() => {
            const latestValue = latestValueRef.current as SlateValue;
            const latestSerialized = serializeValue(latestValue);

            if (latestSerialized === lastSavedSerializedRef.current) {
                return;
            }

            const run = async () => {
                try {
                    const result = await onAutoSave(latestValue);

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
        editorValue,
        onAutoSave,
        onValueChange,
        updateDirty,
        valueVersion,
    ]);

    useEffect(() => {
        return () => {
            clearAutosaveTimer();
        };
    }, [clearAutosaveTimer]);

    return null;
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
    const manualSaveRef = useRef<(() => void) | null>(null);

    const plugins = useMemo(() => {
        const result = createFountainPlugins();

        return result;
    }, []);
    const editor = usePlateEditor({
        plugins,
        value: (initialValue) as Value,
    });

    useEffect(() => {
        if (!onManualSave) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                manualSaveRef.current?.();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onManualSave]);

    editor.getChunkSize = () => 100;

    return (
        <div className={styles.root}>
            <Plate editor={editor}>
                <EditorStateProvider>
                    <EditorAutosave
                        autoSaveDelayMs={autoSaveDelayMs}
                        initialValue={initialValue}
                        manualSaveRef={manualSaveRef}
                        onAutoSave={onAutoSave}
                        onDirtyChange={onDirtyChange}
                        onManualSave={onManualSave}
                        onValueChange={onValueChange}
                    />
                    <EditorToolbar />
                    <EditorCanvas renderLeaf={FountainLeaf} autoFocus={autoFocus} />
                </EditorStateProvider>
            </Plate>
        </div>
    );
};

export default Editor;
