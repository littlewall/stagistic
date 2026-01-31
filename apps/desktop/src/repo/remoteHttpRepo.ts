import type {ScriptSummary} from '@stagistic/db';
import type {ScriptRepository} from '@stagistic/sync-core';

export const createRemoteHttpRepository = (): ScriptRepository => {
    const notImplemented = () => {
        throw new Error('Not implemented');
    };

    return {
        listScripts: async () => notImplemented() as ScriptSummary[],
        createScript: async () => notImplemented(),
        renameScript: async () => notImplemented(),
        deleteScript: async () => notImplemented(),
        setActiveBlock: async () => notImplemented(),
        loadLatest: async () => notImplemented(),
        saveLatest: async () => notImplemented(),
        commitVersion: async () => notImplemented(),
        loadVersion: async () => notImplemented(),
        restoreLatestFromVersion: async () => notImplemented(),
    } satisfies ScriptRepository;
};
