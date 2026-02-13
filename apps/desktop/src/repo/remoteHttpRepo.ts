import type {ScriptSummary} from '@stagistic/db';
import type {ScriptRepository} from '@stagistic/sync-core';

export const createRemoteHttpRepository = (): ScriptRepository => {
    const notImplemented = () => {
        throw new Error('Not implemented');
    };

    return {
        listScripts: () => notImplemented() as Promise<ScriptSummary[]>,
        getScriptSummary: () => notImplemented() as Promise<ScriptSummary | null>,
        createScript: () => notImplemented(),
        renameScript: () => notImplemented(),
        deleteScript: () => notImplemented(),
        setActiveBlock: () => notImplemented(),
        loadLatest: () => notImplemented(),
        saveLatest: () => notImplemented(),
        commitVersion: () => notImplemented(),
        loadScriptConfig: () => notImplemented(),
        saveScriptConfig: () => notImplemented(),
        deleteScriptConfig: () => notImplemented(),
        loadVersion: () => notImplemented(),
        restoreLatestFromVersion: () => notImplemented(),
    } satisfies ScriptRepository;
};
