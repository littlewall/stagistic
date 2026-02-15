import type {ScriptSummary} from '@stagistic/db';
import type {
    EditorSettingsOverride,
    ScriptDocument,
} from '@stagistic/script-core';

export type ScriptCharacterRef = {
    id: string,
    key: string,
};

export interface ScriptRepository {
    listScripts(options?: {limit?: number}): Promise<ScriptSummary[]>,
    getScriptSummary(scriptId: string): Promise<ScriptSummary | null>,
    listScriptCharacters(scriptId: string): Promise<ScriptCharacterRef[]>,
    createScript(title: string, initialContent?: ScriptDocument): Promise<string>,
    renameScript(scriptId: string, title: string): Promise<void>,
    deleteScript(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
    confirmScriptCharacter(scriptId: string, characterKey: string): Promise<ScriptCharacterRef | null>,
    deleteScriptCharacter(scriptId: string, characterId: string): Promise<void>,
    renameScriptCharacter(scriptId: string, characterId: string, nextCharacterKey: string): Promise<ScriptCharacterRef | null>,
    loadLatest(scriptId: string): Promise<ScriptDocument | null>,
    saveLatest(scriptId: string, value: ScriptDocument): Promise<void>,
    commitVersion(scriptId: string, message?: string): Promise<string>,
    loadScriptConfig(scriptId: string, namespace: string): Promise<EditorSettingsOverride | null>,
    saveScriptConfig(scriptId: string, namespace: string, settings: EditorSettingsOverride): Promise<void>,
    deleteScriptConfig(scriptId: string, namespace: string): Promise<void>,
    loadVersion?(versionId: string): Promise<ScriptDocument | null>,
    restoreLatestFromVersion?(scriptId: string, versionId: string): Promise<void>,
}
