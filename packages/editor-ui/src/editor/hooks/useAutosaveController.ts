import {
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

import {stripScriptSettings} from '../editorSettings';
import {useLatestRef} from './useLatestRef';

export type SaveResult = boolean | void | Promise<boolean | void>;

type UseAutosaveControllerArgs = {
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
};

const DEFAULT_AUTOSAVE_DELAY_MS = 1500;

export const serializeDocumentForSave = (value: ScriptDocument) => {
    return JSON.stringify(stripScriptSettings(value));
};

export const useAutosaveController = ({
    onAutoSave,
    onManualSave,
    onDirtyChange,
    autoSaveDelayMs,
}: UseAutosaveControllerArgs) => {
    const latestValueRef = useRef<ScriptDocument | null>(null);
    const lastSavedSerializedRef = useRef<string>('');
    const autosaveTimerRef = useRef<number | null>(null);
    const dirtyRef = useRef(false);
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

    const setLatestValue = useCallback((value: ScriptDocument) => {
        latestValueRef.current = value;
    }, []);

    const syncInitialValue = useCallback((value: ScriptDocument, initialSerialized: string) => {
        latestValueRef.current = stripScriptSettings(value);
        lastSavedSerializedRef.current = initialSerialized;
        updateDirty(false);
        clearAutosaveTimer();
    }, [clearAutosaveTimer, updateDirty]);

    const scheduleAutosave = useCallback((nextValue: ScriptDocument) => {
        const serialized = serializeDocumentForSave(nextValue);
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

            if (!latestValue) {
                return;
            }

            const latestSerialized = serializeDocumentForSave(latestValue);

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

        if (!currentValue) {
            return;
        }

        const serialized = serializeDocumentForSave(currentValue);

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

    useEffect(() => {
        return () => {
            clearAutosaveTimer();
        };
    }, [clearAutosaveTimer]);

    return {
        clearAutosaveTimer,
        scheduleAutosave,
        handleManualSave,
        setLatestValue,
        syncInitialValue,
    };
};
