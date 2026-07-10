import type {
    EditorSettingsOverride,
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

import type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptCue,
    ScriptSummary,
} from './types';

export type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
} from './types';

export interface ListScriptsOptions {
    limit?: number,
}

export interface RenameScriptInput {
    title: string,
    subtitle: string | null,
}

export interface DuplicateScriptInput {
    title: string,
    copySettings: boolean,
    copyAttributes: boolean,
}

export interface CreateScriptCueInput {
    title: string,
    kind: 'song' | 'instrumental',
}

export interface ScriptCuesRepository {
    list(scriptId: string): Promise<ScriptCue[]>,
    create(scriptId: string, input: CreateScriptCueInput): Promise<ScriptCue | null>,
    delete(scriptId: string, cueId: string): Promise<void>,
    unassign(scriptId: string, cueId: string): Promise<ScriptCue | null>,
}

export interface ScriptTitlePageRepository {
    load(scriptId: string): Promise<TitlePageSettings | null>,
    save(scriptId: string, settings: TitlePageSettings): Promise<void>,
    delete(scriptId: string): Promise<void>,
}

export interface ScriptRepository {
    listScripts(options?: ListScriptsOptions): Promise<ScriptSummary[]>,
    getScriptSummary(scriptId: string): Promise<ScriptSummary | null>,
    listScriptCharacters(scriptId: string): Promise<ScriptCharacterRef[]>,
    listScriptCharacterGenders(scriptId: string): Promise<ScriptCharacterGenderOption[]>,
    listScriptCues(scriptId: string): Promise<ScriptCue[]>,
    createScriptCue(scriptId: string, input: CreateScriptCueInput): Promise<ScriptCue | null>,
    deleteScriptCue(scriptId: string, cueId: string): Promise<void>,
    unassignScriptCue(scriptId: string, cueId: string): Promise<ScriptCue | null>,
    createScript(title: string, initialContent?: ScriptDocument): Promise<string>,
    renameScript(scriptId: string, input: RenameScriptInput): Promise<void>,
    renameScriptTitle(scriptId: string, title: string): Promise<void>,
    duplicateScript(sourceScriptId: string, input: DuplicateScriptInput): Promise<string>,
    deleteScript(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
    confirmScriptCharacter(scriptId: string, characterKey: string): Promise<ScriptCharacterRef | null>,
    deleteScriptCharacter(scriptId: string, characterId: string): Promise<void>,
    renameScriptCharacter(scriptId: string, characterId: string, nextCharacterKey: string): Promise<ScriptCharacterRef | null>,
    setScriptCharacterColor(scriptId: string, characterId: string, colorHex: string | null): Promise<ScriptCharacterRef | null>,
    setScriptCharacterGender(scriptId: string, characterId: string, genderKey: string | null): Promise<ScriptCharacterRef | null>,
    setScriptCharacterOutline(scriptId: string, characterId: string, outline: string | null): Promise<ScriptCharacterRef | null>,
    upsertScriptCharacterGender(scriptId: string, label: string): Promise<ScriptCharacterGenderOption | null>,
    loadLatest(scriptId: string): Promise<ScriptDocument | null>,
    saveLatest(scriptId: string, value: ScriptDocument): Promise<void>,
    loadScriptSettings(scriptId: string): Promise<EditorSettingsOverride | null>,
    saveScriptSettings(scriptId: string, settings: EditorSettingsOverride): Promise<void>,
    deleteScriptSettings(scriptId: string): Promise<void>,
    loadTitlePage(scriptId: string): Promise<TitlePageSettings | null>,
    saveTitlePage(scriptId: string, settings: TitlePageSettings): Promise<void>,
    deleteTitlePage(scriptId: string): Promise<void>,
}
