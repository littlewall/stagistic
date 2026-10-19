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
};

export const useSaveIndicator = (): SaveIndicatorController => {
    const [saveIndicator, setSaveIndicator] = useState<ScriptSyncState>('idle');
    const pendingSaveRef = useRef(0);
    const slowSaveTimerRef = useRef<number | null>(null);

    const startSaveIndicator = useCallback(() => {
        pendingSaveRef.current += 1;

        setSaveIndicator(current => {
            return current === 'saved' ? 'idle' : current;
        });

        if (slowSaveTimerRef.current) {
            window.clearTimeout(slowSaveTimerRef.current);
        }

        slowSaveTimerRef.current = window.setTimeout(() => {
            if (pendingSaveRef.current > 0) {
                setSaveIndicator('saving');
            }
        }, SAVE_SLOW_INDICATOR_MS);
    }, []);

    const finishSaveIndicator = useCallback((success: boolean) => {
        if (!success) {
            setSaveIndicator('error');
        }

        pendingSaveRef.current = Math.max(0, pendingSaveRef.current - 1);

        if (pendingSaveRef.current === 0) {
            if (slowSaveTimerRef.current) {
                window.clearTimeout(slowSaveTimerRef.current);
                slowSaveTimerRef.current = null;
            }

            if (!success) {
                setSaveIndicator('error');

                return;
            }

            setSaveIndicator('saved');
        }
    }, []);

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
    };
};
