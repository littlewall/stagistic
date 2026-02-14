import type {ScriptSummary} from '@stagistic/db';
import type {
    ScriptCharacterRef,
    ScriptRepository,
} from '@stagistic/sync-core';

export const createRemoteHttpRepository = (): ScriptRepository => {
    const notImplemented = () => {
        throw new Error('Not implemented');
    };

    return {
        listScripts: () => notImplemented() as Promise<ScriptSummary[]>,
        getScriptSummary: () => notImplemented() as Promise<ScriptSummary | null>,
        listScriptCharacters: () => notImplemented() as Promise<ScriptCharacterRef[]>,
        createScript: () => notImplemented(),
        renameScript: () => notImplemented(),
        deleteScript: () => notImplemented(),
        setActiveBlock: () => notImplemented(),
        confirmScriptCharacter: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        deleteScriptCharacter: () => notImplemented(),
        renameScriptCharacter: () => notImplemented() as Promise<ScriptCharacterRef | null>,
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
