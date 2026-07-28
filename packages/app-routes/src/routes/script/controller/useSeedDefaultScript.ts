import {
    ensureSceneHeading,
    ensureScriptBlockIds,
    ensureScriptStructure,
    type ScriptDocument,
} from '@stagistic/script';
import {
    useCallback,
    useRef,
} from 'react';
import {type NavigateFunction} from 'react-router-dom';

import type {AppToastPayload} from '../types';

const DEFAULT_SCRIPT_TITLE = 'Untitled script';
const SEED_COOLDOWN_MS = 5000;

type SeedDefaultScriptActions = {
    createScript: (title: string, initialContent?: ScriptDocument) => Promise<string>,
};

export const useSeedDefaultScript = (
    scriptActions: SeedDefaultScriptActions,
    navigate: NavigateFunction,
    addToast: (toast: AppToastPayload) => void,
    setStorageError: (value: string | null) => void,
) => {
    const seedStateRef = useRef({
        pending: false,
        lastAttempt: 0,
        seeded: false,
    });

    return useCallback(async () => {
        const now = Date.now();

        if (seedStateRef.current.seeded || seedStateRef.current.pending) {
            return;
        }

        if (now - seedStateRef.current.lastAttempt < SEED_COOLDOWN_MS) {
            return;
        }

        seedStateRef.current.lastAttempt = now;
        seedStateRef.current.pending = true;

        try {
            const seedValue = ensureScriptStructure(ensureScriptBlockIds(ensureSceneHeading(null)));
            const newScriptId = await scriptActions.createScript(DEFAULT_SCRIPT_TITLE, seedValue);

            seedStateRef.current.seeded = true;
            void navigate(`/script/${newScriptId}/editor`, {replace: true});
        } catch {
            console.error('Failed to seed default script');
            setStorageError('Failed to initialize local storage.');
            addToast({
                title: 'Failed to initialize storage',
                description: 'Please restart the app.',
                variant: 'error',
            });
        } finally {
            seedStateRef.current.pending = false;
        }
    }, [
        addToast,
        navigate,
        scriptActions,
        setStorageError,
    ]);
};
