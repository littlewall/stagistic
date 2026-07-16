import {
    ensureSceneHeading,
    ensureScriptBlockIds,
    ensureScriptStructure,
    getFirstBlockId,
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

type SeedDefaultScriptRepository = {
    createScript: (title: string, initialContent?: ScriptDocument) => Promise<string>,
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<void>,
};

export const useSeedDefaultScript = (
    scriptRepository: SeedDefaultScriptRepository,
    refreshRecentScripts: () => Promise<void>,
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
            const newScriptId = await scriptRepository.createScript(DEFAULT_SCRIPT_TITLE, seedValue);
            const activeBlockId = getFirstBlockId(seedValue);

            if (activeBlockId) {
                await scriptRepository.setActiveBlock(newScriptId, activeBlockId);
            }

            void refreshRecentScripts();

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
        refreshRecentScripts,
        scriptRepository,
        setStorageError,
    ]);
};
