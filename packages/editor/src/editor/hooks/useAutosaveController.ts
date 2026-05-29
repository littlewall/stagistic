import {
    type ScriptDocument,
} from '@stagistic/script';
import {
    useCallback,
    useEffect,
    useRef,
} from 'react';

import {stripScriptSettings} from '../editorSettings';
import {useLatestRef} from './useLatestRef';

export type SaveResult = boolean | void | Promise<boolean | void>;

export interface AutosaveSchedulePayload {
    value?: ScriptDocument,
    revision?: number,
    /**
     * Persist immediately, bypassing the debounce. Used for discrete, intentional
     * actions (scene reorder, act insert/delete/rename, block-type change) where
     * coalescing makes no sense — only continuous typing needs the debounce.
     */
    immediate?: boolean,
}

type UseAutosaveControllerArgs = {
    onAutoSave?: (value: ScriptDocument) => SaveResult,
    onManualSave?: (value: ScriptDocument) => SaveResult,
    onDirtyChange?: (isDirty: boolean) => void,
    autoSaveDelayMs?: number,
    resolveLatestValue?: () => ScriptDocument | null,
};

const DEFAULT_AUTOSAVE_DELAY_MS = 1500;

export const serializeDocumentForSave = (value: ScriptDocument) => {
    return JSON.stringify(stripScriptSettings(value));
};

const toRevision = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(0, Math.trunc(value));
};

const isAutosaveSchedulePayload = (value: unknown): value is AutosaveSchedulePayload => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return 'value' in value || 'revision' in value || 'immediate' in value;
};

const resolveSchedulePayload = (
    input?: ScriptDocument | AutosaveSchedulePayload,
): AutosaveSchedulePayload => {
    if (!input) {
        return {};
    }

    if (isAutosaveSchedulePayload(input)) {
        return input;
    }

    return {
        value: input,
    };
};

export const useAutosaveController = ({
    onAutoSave,
    onManualSave,
    onDirtyChange,
    autoSaveDelayMs,
    resolveLatestValue,
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
    }, [onAutoSaveRef, resolveLatestValueNow, updateDirty]);

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

        // Discrete actions persist now; only continuous typing waits the debounce.
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

    /*
     * Flush any pending (debounced) edit immediately, bypassing the wait timer.
     * Used on page-hide / unmount so the last edits before a refresh or
     * navigation are not lost inside the debounce window. Silent (no toast):
     * routes through the autosave handler, not the manual-save handler.
     */
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
            // Flush on unmount (SPA navigation) instead of dropping pending edits.
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
