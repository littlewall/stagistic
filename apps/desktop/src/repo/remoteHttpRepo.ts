import type {ScriptSummary} from '@stagistic/db';
import type {
    ScriptCharacterGenderOption,
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
        listScriptCharacterGenders: () => notImplemented() as Promise<ScriptCharacterGenderOption[]>,
        createScript: () => notImplemented(),
        renameScript: () => notImplemented(),
        deleteScript: () => notImplemented(),
        setActiveBlock: () => notImplemented(),
        confirmScriptCharacter: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        deleteScriptCharacter: () => notImplemented(),
        renameScriptCharacter: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        setScriptCharacterColor: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        setScriptCharacterGender: () => notImplemented() as Promise<ScriptCharacterRef | null>,
        upsertScriptCharacterGender: () => notImplemented() as Promise<ScriptCharacterGenderOption | null>,
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
