import type {
    EditorSettingsOverride,
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

import type {
    ListScriptBlocksOptions,
    ScriptBlockCharacterRefRow,
    ScriptBlockOrderMove,
    ScriptBlockUpsertRow,
    UpdateScriptSceneMetadataPayload,
    UpsertScriptActPayload,
    UpsertScriptLocationPayload,
    UpsertScriptScenePayload,
} from './queries';
import type {
    ScriptAct,
    ScriptBlock,
    ScriptBlockCharacterRef,
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptLocation,
    ScriptScene,
    ScriptSummary,
} from './types';

export type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
} from './types';

export interface ListScriptsOptions {
    limit?: number,
}

export interface ScriptCrudRepository {
    list(options?: ListScriptsOptions): Promise<ScriptSummary[]>,
    getSummary(scriptId: string): Promise<ScriptSummary | null>,
    create(title: string, initialContent?: ScriptDocument): Promise<string>,
    rename(scriptId: string, title: string): Promise<void>,
    delete(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
}

export interface ScriptCharactersRepository {
    list(scriptId: string): Promise<ScriptCharacterRef[]>,
    confirm(scriptId: string, characterKey: string): Promise<ScriptCharacterRef | null>,
    delete(scriptId: string, characterId: string): Promise<void>,
    rename(scriptId: string, characterId: string, nextCharacterKey: string): Promise<ScriptCharacterRef | null>,
    setColor(scriptId: string, characterId: string, colorHex: string | null): Promise<ScriptCharacterRef | null>,
    setGender(scriptId: string, characterId: string, genderKey: string | null): Promise<ScriptCharacterRef | null>,
}

export interface ScriptCharacterGendersRepository {
    list(scriptId: string): Promise<ScriptCharacterGenderOption[]>,
    upsert(scriptId: string, label: string): Promise<ScriptCharacterGenderOption | null>,
}

export interface ScriptContentRepository {
    loadLatest(scriptId: string): Promise<ScriptDocument | null>,
    saveLatest(scriptId: string, value: ScriptDocument): Promise<void>,
}

export interface ScriptSettingsRepository {
    load(scriptId: string): Promise<EditorSettingsOverride | null>,
    save(scriptId: string, settings: EditorSettingsOverride): Promise<void>,
    delete(scriptId: string): Promise<void>,
}

export interface ScriptBlocksRepository {
    list(scriptId: string, options?: ListScriptBlocksOptions): Promise<ScriptBlock[]>,
    listByScene(sceneId: string): Promise<ScriptBlock[]>,
    listByAct(actId: string): Promise<ScriptBlock[]>,
    getById(blockId: string): Promise<ScriptBlock | null>,
    bulkUpsert(rows: ScriptBlockUpsertRow[]): Promise<void>,
    bulkDelete(blockIds: string[]): Promise<void>,
    reorder(scriptId: string, moves: ScriptBlockOrderMove[]): Promise<void>,
}

export interface ScriptScenesRepository {
    list(scriptId: string): Promise<ScriptScene[]>,
    upsert(payload: UpsertScriptScenePayload): Promise<void>,
    delete(sceneId: string): Promise<void>,
    updateMetadata(payload: UpdateScriptSceneMetadataPayload): Promise<void>,
}

export interface ScriptActsRepository {
    list(scriptId: string): Promise<ScriptAct[]>,
    upsert(payload: UpsertScriptActPayload): Promise<void>,
    delete(actId: string): Promise<void>,
}

export interface ScriptLocationsRepository {
    list(scriptId: string): Promise<ScriptLocation[]>,
    upsert(payload: UpsertScriptLocationPayload): Promise<void>,
    delete(locationId: string): Promise<void>,
}

export interface ScriptBlockCharacterRefsRepository {
    listByBlock(blockId: string): Promise<ScriptBlockCharacterRef[]>,
    listByScript(scriptId: string): Promise<ScriptBlockCharacterRef[]>,
    listByCharacter(characterId: string): Promise<ScriptBlockCharacterRef[]>,
    replaceForBlock(blockId: string, rows: ScriptBlockCharacterRefRow[]): Promise<void>,
    deleteByCharacterIds(characterIds: string[]): Promise<void>,
}

export interface ScriptTitlePageRepository {
    load(scriptId: string): Promise<TitlePageSettings | null>,
    save(scriptId: string, settings: TitlePageSettings): Promise<void>,
    delete(scriptId: string): Promise<void>,
}

export interface ScriptDataRepository {
    scripts: ScriptCrudRepository,
    content: ScriptContentRepository,
    settings: ScriptSettingsRepository,
    titlePage: ScriptTitlePageRepository,
    characters: ScriptCharactersRepository,
    characterGenders: ScriptCharacterGendersRepository,
    blocks: ScriptBlocksRepository,
    scenes: ScriptScenesRepository,
    acts: ScriptActsRepository,
    locations: ScriptLocationsRepository,
    blockCharacterRefs: ScriptBlockCharacterRefsRepository,
}

export interface ScriptRepository extends ScriptDataRepository {
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
    loadScriptSettings(scriptId: string): Promise<EditorSettingsOverride | null>,
    saveScriptSettings(scriptId: string, settings: EditorSettingsOverride): Promise<void>,
    deleteScriptSettings(scriptId: string): Promise<void>,
    loadTitlePage(scriptId: string): Promise<TitlePageSettings | null>,
    saveTitlePage(scriptId: string, settings: TitlePageSettings): Promise<void>,
    deleteTitlePage(scriptId: string): Promise<void>,
}
