import type {
    InsertScriptSceneVersionPayload,
    ListScriptBlocksOptions,
    ScriptAct,
    ScriptBlock,
    ScriptBlockAnnotation,
    ScriptBlockCharacterRef,
    ScriptBlockCharacterRefRow,
    ScriptBlockOrderMove,
    ScriptBlockUpsertRow,
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptCostume,
    ScriptCueSheet,
    ScriptCueSheetAnnotation,
    ScriptCueSheetAnnotationRow,
    ScriptLayer,
    ScriptLocation,
    ScriptMember,
    ScriptPermission,
    ScriptProp,
    ScriptScene,
    ScriptSceneCostume,
    ScriptSceneCostumeRow,
    ScriptSceneProp,
    ScriptScenePropRow,
    ScriptSceneVersion,
    ScriptSummary,
    ScriptView,
    UpdateScriptSceneMetadataPayload,
    UpsertScriptActPayload,
    UpsertScriptBlockAnnotationPayload,
    UpsertScriptCostumePayload,
    UpsertScriptCueSheetPayload,
    UpsertScriptLayerPayload,
    UpsertScriptLocationPayload,
    UpsertScriptMemberPayload,
    UpsertScriptPermissionPayload,
    UpsertScriptPropPayload,
    UpsertScriptScenePayload,
    UpsertScriptViewPayload,
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

export interface ScriptVersionsRepository {
    commit(scriptId: string, message?: string): Promise<string>,
    load(versionId: string): Promise<ScriptDocument | null>,
    restoreLatest(scriptId: string, versionId: string): Promise<void>,
}

export interface ScriptConfigsRepository {
    load(scriptId: string, namespace: string): Promise<EditorSettingsOverride | null>,
    save(scriptId: string, namespace: string, settings: EditorSettingsOverride): Promise<void>,
    delete(scriptId: string, namespace: string): Promise<void>,
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

export interface ScriptLayersRepository {
    list(scriptId: string): Promise<ScriptLayer[]>,
    upsert(payload: UpsertScriptLayerPayload): Promise<void>,
    setVisibility(layerId: string, isVisible: boolean, updatedAt: number): Promise<void>,
    delete(layerId: string): Promise<void>,
}

export interface ScriptAnnotationsRepository {
    listByBlock(blockId: string, layerId?: string): Promise<ScriptBlockAnnotation[]>,
    listByLayer(layerId: string): Promise<ScriptBlockAnnotation[]>,
    upsert(payload: UpsertScriptBlockAnnotationPayload): Promise<void>,
    updateStatus(annotationId: string, status: string, updatedAt: number): Promise<void>,
    delete(annotationId: string): Promise<void>,
}

export interface ScriptViewsRepository {
    list(scriptId: string): Promise<ScriptView[]>,
    getById(viewId: string): Promise<ScriptView | null>,
    upsert(payload: UpsertScriptViewPayload): Promise<void>,
    delete(viewId: string): Promise<void>,
}

export interface ScriptSceneVersionsRepository {
    list(sceneId: string): Promise<ScriptSceneVersion[]>,
    getById(versionId: string): Promise<ScriptSceneVersion | null>,
    insert(payload: InsertScriptSceneVersionPayload): Promise<void>,
}

export interface ScriptPropsRepository {
    list(scriptId: string): Promise<ScriptProp[]>,
    upsert(payload: UpsertScriptPropPayload): Promise<void>,
    delete(propId: string): Promise<void>,
    listByScene(sceneId: string): Promise<ScriptSceneProp[]>,
    replaceSceneRows(sceneId: string, rows: ScriptScenePropRow[]): Promise<void>,
}

export interface ScriptCostumesRepository {
    list(scriptId: string): Promise<ScriptCostume[]>,
    upsert(payload: UpsertScriptCostumePayload): Promise<void>,
    delete(costumeId: string): Promise<void>,
    listByScene(sceneId: string): Promise<ScriptSceneCostume[]>,
    replaceSceneRows(sceneId: string, rows: ScriptSceneCostumeRow[]): Promise<void>,
}

export interface ScriptCueSheetsRepository {
    list(scriptId: string): Promise<ScriptCueSheet[]>,
    upsert(payload: UpsertScriptCueSheetPayload): Promise<void>,
    delete(cueSheetId: string): Promise<void>,
    listAnnotations(cueSheetId: string): Promise<ScriptCueSheetAnnotation[]>,
    replaceAnnotations(cueSheetId: string, rows: ScriptCueSheetAnnotationRow[]): Promise<void>,
}

export interface ScriptMembersRepository {
    list(scriptId: string): Promise<ScriptMember[]>,
    upsert(payload: UpsertScriptMemberPayload): Promise<void>,
    delete(memberId: string): Promise<void>,
}

export interface ScriptPermissionsRepository {
    list(scriptId: string): Promise<ScriptPermission[]>,
    upsert(payload: UpsertScriptPermissionPayload): Promise<void>,
    delete(permissionId: string): Promise<void>,
}

export interface ScriptDataRepository {
    scripts: ScriptCrudRepository,
    content: ScriptContentRepository,
    versions: ScriptVersionsRepository,
    configs: ScriptConfigsRepository,
    characters: ScriptCharactersRepository,
    characterGenders: ScriptCharacterGendersRepository,
    blocks: ScriptBlocksRepository,
    scenes: ScriptScenesRepository,
    acts: ScriptActsRepository,
    locations: ScriptLocationsRepository,
    blockCharacterRefs: ScriptBlockCharacterRefsRepository,
    layers: ScriptLayersRepository,
    annotations: ScriptAnnotationsRepository,
    views: ScriptViewsRepository,
    sceneVersions: ScriptSceneVersionsRepository,
    props: ScriptPropsRepository,
    costumes: ScriptCostumesRepository,
    cueSheets: ScriptCueSheetsRepository,
    members: ScriptMembersRepository,
    permissions: ScriptPermissionsRepository,
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
    commitVersion(scriptId: string, message?: string): Promise<string>,
    loadScriptConfig(scriptId: string, namespace: string): Promise<EditorSettingsOverride | null>,
    saveScriptConfig(scriptId: string, namespace: string, settings: EditorSettingsOverride): Promise<void>,
    deleteScriptConfig(scriptId: string, namespace: string): Promise<void>,
    loadVersion?(versionId: string): Promise<ScriptDocument | null>,
    restoreLatestFromVersion?(scriptId: string, versionId: string): Promise<void>,
}
