import {type ScriptSyncState} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

const SAVE_SLOW_INDICATOR_MS = 600;
const SAVE_SUCCESS_INDICATOR_MS = 1200;

type SaveIndicatorController = {
    saveIndicator: ScriptSyncState,
    startSaveIndicator: () => void,
    finishSaveIndicator: (success: boolean) => void,
    trackSave: <T>(save: () => Promise<T>) => Promise<T>,
};

export const useSaveIndicator = (): SaveIndicatorController => {
    const [saveIndicator, setSaveIndicator] = useState<ScriptSyncState>('idle');
    const pendingSaveRef = useRef(0);
    const failedSaveRef = useRef(false);
    const slowSaveTimerRef = useRef<number | null>(null);

    const startSaveIndicator = useCallback(() => {
        pendingSaveRef.current += 1;

        if (pendingSaveRef.current > 1) return;

        failedSaveRef.current = false;
        setSaveIndicator('idle');

        slowSaveTimerRef.current = window.setTimeout(() => {
            if (pendingSaveRef.current > 0 && !failedSaveRef.current) {
                setSaveIndicator('saving');
            }
        }, SAVE_SLOW_INDICATOR_MS);
    }, []);

    const finishSaveIndicator = useCallback((success: boolean) => {
        if (!success) {
            failedSaveRef.current = true;
            setSaveIndicator('error');
        }

        pendingSaveRef.current = Math.max(0, pendingSaveRef.current - 1);

        if (pendingSaveRef.current === 0) {
            if (slowSaveTimerRef.current) {
                window.clearTimeout(slowSaveTimerRef.current);
                slowSaveTimerRef.current = null;
            }

            if (failedSaveRef.current) {
                setSaveIndicator('error');

                return;
            }

            setSaveIndicator('saved');
        }
    }, []);

    const trackSave = useCallback(async <T>(save: () => Promise<T>): Promise<T> => {
        startSaveIndicator();

        try {
            const result = await save();

            finishSaveIndicator(true);

            return result;
        } catch (error) {
            finishSaveIndicator(false);
            throw error;
        }
    }, [finishSaveIndicator, startSaveIndicator]);

    useEffect(() => {
        if (saveIndicator !== 'saved') {
            return;
        }

        const successTimer = window.setTimeout(() => {
            setSaveIndicator('idle');
        }, SAVE_SUCCESS_INDICATOR_MS);

        return () => {
            window.clearTimeout(successTimer);
        };
    }, [saveIndicator]);

    useEffect(() => {
        return () => {
            if (slowSaveTimerRef.current) {
                window.clearTimeout(slowSaveTimerRef.current);
            }
        };
    }, []);

    return {
        saveIndicator,
        startSaveIndicator,
        finishSaveIndicator,
        trackSave,
    };
};
