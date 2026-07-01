import type {ScriptDocument} from '@stagistic/script';
import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

import {stripScriptSettings} from '../editorSettings';
import {
    type AutosaveSchedulePayload,
    DEFAULT_AUTOSAVE_DELAY_MS,
    resolveSchedulePayload,
    type SaveResult,
    toRevision,
} from './autosaveControllerHelpers';
import {useLatestRef} from './useLatestRef';

export type {AutosaveSchedulePayload, SaveResult} from './autosaveControllerHelpers';
export {serializeDocumentForSave} from './autosaveControllerHelpers';

type UseAutosaveControllerArgs = {
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    resolveLatestValue?: () => ScriptDocument | null,
    onValueSynced?: (value: ScriptDocument, revision: number) => void,
};

export const useAutosaveController = ({
    onAutoSave,
    onManualSave,
    onDirtyChange,
    autoSaveDelayMs,
    resolveLatestValue,
    onValueSynced,
}: UseAutosaveControllerArgs) => {
    const latestValueRef = useRef<ScriptDocument | null>(null);
    const latestRevisionRef = useRef(0);
    const lastSavedRevisionRef = useRef(0);
    const autosaveTimerRef = useRef<number | null>(null);
    const dirtyRef = useRef(false);
    const onAutoSaveRef = useLatestRef(onAutoSave);
    const onManualSaveRef = useLatestRef(onManualSave);
    const onDirtyChangeRef = useLatestRef(onDirtyChange);
    const resolveLatestValueRef = useLatestRef(resolveLatestValue);
    const onValueSyncedRef = useLatestRef(onValueSynced);

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

    const resolveLatestValueNow = useCallback(() => {
        const resolver = resolveLatestValueRef.current;

        if (!resolver) {
            return latestValueRef.current;
        }

        const resolved = resolver();

        if (resolved) {
            latestValueRef.current = resolved;

            return resolved;
        }

        return latestValueRef.current;
    }, [resolveLatestValueRef]);

    const setLatestValueWithRevision = useCallback((value: ScriptDocument, revision?: number) => {
        latestValueRef.current = value;

        const normalizedRevision = toRevision(revision);

        if (normalizedRevision === null) {
            return;
        }

        latestRevisionRef.current = Math.max(latestRevisionRef.current, normalizedRevision);
    }, []);

    const syncInitialValue = useCallback((
        value: ScriptDocument,
        _initialSerialized: string,
        revision?: number,
    ) => {
        const nextRevision = toRevision(revision) ?? 0;

        latestValueRef.current = stripScriptSettings(value);
        latestRevisionRef.current = nextRevision;
        lastSavedRevisionRef.current = nextRevision;
        updateDirty(false);
        clearAutosaveTimer();
    }, [clearAutosaveTimer, updateDirty]);

    /*
     * Run the pending save right now (if dirty), bypassing the debounce. Shared
     * by the debounce timer, immediate saves, and the page-hide/unmount flush.
     */
    const runSaveNow = useCallback(() => {
        const autoSaveHandler = onAutoSaveRef.current;

        if (!autoSaveHandler) {
            return;
        }

        const latestValue = resolveLatestValueNow();

        if (!latestValue) {
            return;
        }

        const revisionToSave = latestRevisionRef.current;

        if (revisionToSave <= lastSavedRevisionRef.current) {
            return;
        }

        onValueSyncedRef.current?.(latestValue, revisionToSave);

        void (async () => {
            try {
                const result = await autoSaveHandler(latestValue);

                if (result === false) {
                    return;
                }

                lastSavedRevisionRef.current = Math.max(lastSavedRevisionRef.current, revisionToSave);
                updateDirty(latestRevisionRef.current > lastSavedRevisionRef.current);
            } catch {
                // onAutoSave should handle reporting errors.
            }
        })();
    }, [
        onAutoSaveRef,
        resolveLatestValueNow,
        updateDirty,
    ]);

    const scheduleAutosave = useCallback((input?: ScriptDocument | AutosaveSchedulePayload) => {
        const payload = resolveSchedulePayload(input);
        const normalizedRevision = toRevision(payload.revision);

        if (payload.value) {
            latestValueRef.current = payload.value;
        }

        if (normalizedRevision !== null) {
            latestRevisionRef.current = Math.max(latestRevisionRef.current, normalizedRevision);
        }

        const isDirty = latestRevisionRef.current > lastSavedRevisionRef.current;

        updateDirty(isDirty);

        const autoSaveHandler = onAutoSaveRef.current;

        if (!autoSaveHandler || !isDirty) {
            clearAutosaveTimer();

            return;
        }

        clearAutosaveTimer();

        if (payload.immediate) {
            runSaveNow();

            return;
        }

        const delay = autoSaveDelayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;

        autosaveTimerRef.current = window.setTimeout(() => {
            autosaveTimerRef.current = null;
            runSaveNow();
        }, delay);
    }, [
        autoSaveDelayMs,
        clearAutosaveTimer,
        onAutoSaveRef,
        runSaveNow,
        updateDirty,
    ]);

    const handleManualSave = useCallback(async () => {
        const manualSaveHandler = onManualSaveRef.current;

        if (!manualSaveHandler) {
            return;
        }

        clearAutosaveTimer();

        const currentValue = resolveLatestValueNow();

        if (!currentValue) {
            return;
        }

        const revisionToSave = latestRevisionRef.current;

        if (revisionToSave <= lastSavedRevisionRef.current) {
            return;
        }

        onValueSyncedRef.current?.(currentValue, revisionToSave);

        try {
            const result = await manualSaveHandler(currentValue);

            if (result === false) {
                return;
            }

            lastSavedRevisionRef.current = Math.max(lastSavedRevisionRef.current, revisionToSave);
            updateDirty(latestRevisionRef.current > lastSavedRevisionRef.current);
        } catch {
            // onManualSave should handle reporting errors.
        }
    }, [
        clearAutosaveTimer,
        onManualSaveRef,
        resolveLatestValueNow,
        updateDirty,
    ]);

    const flushPendingSave = useCallback(() => {
        clearAutosaveTimer();
        runSaveNow();
    }, [clearAutosaveTimer, runSaveNow]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                flushPendingSave();
            }
        };

        window.addEventListener('pagehide', flushPendingSave);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('pagehide', flushPendingSave);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            flushPendingSave();
            clearAutosaveTimer();
        };
    }, [clearAutosaveTimer, flushPendingSave]);

    return {
        clearAutosaveTimer,
        scheduleAutosave,
        handleManualSave,
        setLatestValue: setLatestValueWithRevision,
        syncInitialValue,
    };
};
