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

    return 'value' in value || 'revision' in value;
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

        const delay = autoSaveDelayMs ?? DEFAULT_AUTOSAVE_DELAY_MS;

        autosaveTimerRef.current = window.setTimeout(() => {
            autosaveTimerRef.current = null;

            const latestValue = resolveLatestValueNow();

            if (!latestValue) {
                return;
            }

            const revisionToSave = latestRevisionRef.current;

            if (revisionToSave <= lastSavedRevisionRef.current) {
                return;
            }

            const run = async () => {
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
            };

            void run();
        }, delay);
    }, [
        autoSaveDelayMs,
        clearAutosaveTimer,
        onAutoSaveRef,
        resolveLatestValueNow,
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

    useEffect(() => {
        return () => {
            clearAutosaveTimer();
        };
    }, [clearAutosaveTimer]);

    return {
        clearAutosaveTimer,
        scheduleAutosave,
        handleManualSave,
        setLatestValue: setLatestValueWithRevision,
        syncInitialValue,
    };
};
