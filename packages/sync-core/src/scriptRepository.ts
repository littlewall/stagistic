import type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptSummary,
} from '@stagistic/db';
import type {
    EditorSettingsOverride,
    ScriptDocument,
} from '@stagistic/script-core';

export type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
} from '@stagistic/db';

export interface ListScriptsOptions {
    limit?: number,
}

export interface ScriptRepository {
    listScripts(options?: ListScriptsOptions): Promise<ScriptSummary[]>,
    getScriptSummary(scriptId: string): Promise<ScriptSummary | null>,
    listScriptCharacters(scriptId: string): Promise<ScriptCharacterRef[]>,
    listScriptCharacterGenders(scriptId: string): Promise<ScriptCharacterGenderOption[]>,
    createScript(title: string, initialContent?: ScriptDocument): Promise<string>,
    renameScript(scriptId: string, title: string): Promise<void>,
    deleteScript(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
    confirmScriptCharacter(scriptId: string, characterKey: string): Promise<ScriptCharacterRef | null>,
    deleteScriptCharacter(scriptId: string, characterId: string): Promise<void>,
    renameScriptCharacter(scriptId: string, characterId: string, nextCharacterKey: string): Promise<ScriptCharacterRef | null>,
    setScriptCharacterColor(scriptId: string, characterId: string, colorHex: string | null): Promise<ScriptCharacterRef | null>,
    setScriptCharacterGender(scriptId: string, characterId: string, genderKey: string | null): Promise<ScriptCharacterRef | null>,
    upsertScriptCharacterGender(scriptId: string, label: string): Promise<ScriptCharacterGenderOption | null>,
    loadLatest(scriptId: string): Promise<ScriptDocument | null>,
    saveLatest(scriptId: string, value: ScriptDocument): Promise<void>,
    commitVersion(scriptId: string, message?: string): Promise<string>,
    loadScriptConfig(scriptId: string, namespace: string): Promise<EditorSettingsOverride | null>,
    saveScriptConfig(scriptId: string, namespace: string, settings: EditorSettingsOverride): Promise<void>,
    deleteScriptConfig(scriptId: string, namespace: string): Promise<void>,
    loadVersion?(versionId: string): Promise<ScriptDocument | null>,
    restoreLatestFromVersion?(scriptId: string, versionId: string): Promise<void>,
}
