import type {
    EditorSettingsOverride,
    ScriptDocument,
    TitlePageSettings,
} from '@stagistic/script';

import type {ReactiveQuerySource} from './reactive';
import type {
    CueAttachmentRole,
    ScriptAttachment,
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptCue,
    ScriptCueAttachment,
    ScriptCueAttachmentBinding,
    ScriptLocation,
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

export interface CreateScriptWithIdInput {
    id: string,
    title: string,
    initialContent?: ScriptDocument,
    activeBlockId?: string | null,
    timestamp?: number,
}

export interface DuplicateScriptWithIdInput extends DuplicateScriptInput {
    targetScriptId: string,
    timestamp?: number,
}

export interface CreateScriptCueInput {
    title: string,
    kind: 'song' | 'instrumental',
}

export interface CreateScriptCueWithIdInput extends CreateScriptCueInput {
    id: string,
    timestamp?: number,
}

export type UpdateScriptCueInput = CreateScriptCueInput;

export interface ConfirmScriptCharacterWithIdInput {
    id: string,
    key: string,
    timestamp?: number,
}

export interface UpsertScriptCharacterGenderWithIdInput {
    id: string,
    label: string,
    timestamp?: number,
}

export interface CreateScriptLocationInput {
    name: string,
}

export interface CreateScriptLocationWithIdInput extends CreateScriptLocationInput {
    id: string,
    timestamp?: number,
}

export interface ScriptCuesRepository {
    list(scriptId: string): Promise<ScriptCue[]>,
    create(scriptId: string, input: CreateScriptCueInput): Promise<ScriptCue | null>,
    createWithId(scriptId: string, input: CreateScriptCueWithIdInput): Promise<ScriptCue | null>,
    update(scriptId: string, cueId: string, input: UpdateScriptCueInput): Promise<ScriptCue | null>,
    delete(scriptId: string, cueId: string): Promise<void>,
}

export interface ScriptLocationsRepository {
    list(scriptId: string): Promise<ScriptLocation[]>,
    listSceneAssignments(scriptId: string): Promise<ScriptSceneLocationAssignment[]>,
    create(scriptId: string, input: CreateScriptLocationInput): Promise<ScriptLocation | null>,
    createWithId(scriptId: string, input: CreateScriptLocationWithIdInput): Promise<ScriptLocation | null>,
    rename(scriptId: string, locationId: string, name: string): Promise<ScriptLocation | null>,
    delete(scriptId: string, locationId: string): Promise<void>,
    replaceSceneAssignments(
        scriptId: string,
        sceneHeadingBlockId: string,
        locationIds: string[],
    ): Promise<string[]>,
}

export interface ScriptSceneLocationAssignment {
    sceneHeadingBlockId: string,
    locationId: string,
}

export interface CueAttachmentUpload {
    name: string,
    type: string,
    size: number,
    blob: Blob,
}

export interface ScriptAttachmentsRepository {
    getByCueRole(cueId: string, role: CueAttachmentRole): Promise<ScriptCueAttachment | null>,
    setForCue(
        scriptId: string,
        cueId: string,
        role: CueAttachmentRole,
        file: CueAttachmentUpload,
    ): Promise<ScriptCueAttachment | null>,
    removeFromCue(scriptId: string, cueId: string, role: CueAttachmentRole): Promise<void>,
    getBlob(storageKey: string): Promise<Blob | null>,
}

export interface ScriptTitlePageRepository {
    load(scriptId: string): Promise<TitlePageSettings | null>,
    save(scriptId: string, settings: TitlePageSettings): Promise<void>,
    delete(scriptId: string): Promise<void>,
}

export interface ScriptTitlePageRecord {
    scriptId: string,
    settings: TitlePageSettings,
}

export interface ScriptEditorSettingsRecord {
    scriptId: string,
    settings: EditorSettingsOverride,
}

export interface ScriptRepository {
    scriptSummaries: ReactiveQuerySource<ScriptSummary>,
    allocateScriptId(): string,
    allocateScriptCharacterId(): string,
    allocateScriptCharacterGenderId(): string,
    allocateScriptCueId(): string,
    allocateScriptLocationId(): string,
    getScriptCharactersSource(scriptId: string): ReactiveQuerySource<ScriptCharacterRef>,
    getScriptCharacterGendersSource(
        scriptId: string,
    ): ReactiveQuerySource<ScriptCharacterGenderOption>,
    getScriptCuesSource(scriptId: string): ReactiveQuerySource<ScriptCue>,
    getScriptLocationsSource(scriptId: string): ReactiveQuerySource<ScriptLocation>,
    getScriptSceneLocationsSource(
        scriptId: string,
    ): ReactiveQuerySource<ScriptSceneLocationAssignment>,
    getScriptTitlePageSource(scriptId: string): ReactiveQuerySource<ScriptTitlePageRecord>,
    getScriptEditorSettingsSource(scriptId: string): ReactiveQuerySource<ScriptEditorSettingsRecord>,
    getScriptAttachmentsSource(scriptId: string): ReactiveQuerySource<ScriptAttachment>,
    getScriptCueAttachmentBindingsSource(
        scriptId: string,
    ): ReactiveQuerySource<ScriptCueAttachmentBinding>,
    listScripts(options?: ListScriptsOptions): Promise<ScriptSummary[]>,
    getScriptSummary(scriptId: string): Promise<ScriptSummary | null>,
    listScriptCharacters(scriptId: string): Promise<ScriptCharacterRef[]>,
    listScriptCharacterGenders(scriptId: string): Promise<ScriptCharacterGenderOption[]>,
    listScriptCues(scriptId: string): Promise<ScriptCue[]>,
    createScriptCue(scriptId: string, input: CreateScriptCueInput): Promise<ScriptCue | null>,
    createScriptCueWithId(
        scriptId: string,
        input: CreateScriptCueWithIdInput,
    ): Promise<ScriptCue | null>,
    updateScriptCue(scriptId: string, cueId: string, input: UpdateScriptCueInput): Promise<ScriptCue | null>,
    deleteScriptCue(scriptId: string, cueId: string): Promise<void>,
    listScriptLocations(scriptId: string): Promise<ScriptLocation[]>,
    listScriptSceneLocations(scriptId: string): Promise<ScriptSceneLocationAssignment[]>,
    createScriptLocation(scriptId: string, input: CreateScriptLocationInput): Promise<ScriptLocation | null>,
    createScriptLocationWithId(
        scriptId: string,
        input: CreateScriptLocationWithIdInput,
    ): Promise<ScriptLocation | null>,
    renameScriptLocation(scriptId: string, locationId: string, name: string): Promise<ScriptLocation | null>,
    deleteScriptLocation(scriptId: string, locationId: string): Promise<void>,
    replaceScriptSceneLocations(
        scriptId: string,
        sceneHeadingBlockId: string,
        locationIds: string[],
    ): Promise<string[]>,
    getCueAttachment(cueId: string, role: CueAttachmentRole): Promise<ScriptCueAttachment | null>,
    setCueAttachment(
        scriptId: string,
        cueId: string,
        role: CueAttachmentRole,
        file: CueAttachmentUpload,
    ): Promise<ScriptCueAttachment | null>,
    removeCueAttachment(scriptId: string, cueId: string, role: CueAttachmentRole): Promise<void>,
    getAttachmentBlob(storageKey: string): Promise<Blob | null>,
    createScript(title: string, initialContent?: ScriptDocument): Promise<string>,
    createScriptWithId(input: CreateScriptWithIdInput): Promise<void>,
    renameScript(scriptId: string, input: RenameScriptInput): Promise<void>,
    renameScriptTitle(scriptId: string, title: string): Promise<void>,
    duplicateScript(sourceScriptId: string, input: DuplicateScriptInput): Promise<string>,
    duplicateScriptWithId(sourceScriptId: string, input: DuplicateScriptWithIdInput): Promise<void>,
    deleteScript(scriptId: string): Promise<void>,
    setActiveBlock(scriptId: string, blockId: string | null): Promise<void>,
    confirmScriptCharacter(scriptId: string, characterKey: string): Promise<ScriptCharacterRef | null>,
    confirmScriptCharacterWithId(
        scriptId: string,
        input: ConfirmScriptCharacterWithIdInput,
    ): Promise<ScriptCharacterRef | null>,
    deleteScriptCharacter(scriptId: string, characterId: string): Promise<void>,
    renameScriptCharacter(scriptId: string, characterId: string, nextCharacterKey: string): Promise<ScriptCharacterRef | null>,
    setScriptCharacterColor(scriptId: string, characterId: string, colorHex: string | null): Promise<ScriptCharacterRef | null>,
    setScriptCharacterGender(scriptId: string, characterId: string, genderKey: string | null): Promise<ScriptCharacterRef | null>,
    setScriptCharacterOutline(scriptId: string, characterId: string, outline: string | null): Promise<ScriptCharacterRef | null>,
    upsertScriptCharacterGender(scriptId: string, label: string): Promise<ScriptCharacterGenderOption | null>,
    upsertScriptCharacterGenderWithId(
        scriptId: string,
        input: UpsertScriptCharacterGenderWithIdInput,
    ): Promise<ScriptCharacterGenderOption | null>,
    loadLatest(scriptId: string): Promise<ScriptDocument | null>,
    saveLatest(scriptId: string, value: ScriptDocument): Promise<void>,
    loadScriptSettings(scriptId: string): Promise<EditorSettingsOverride | null>,
    saveScriptSettings(scriptId: string, settings: EditorSettingsOverride): Promise<void>,
    deleteScriptSettings(scriptId: string): Promise<void>,
    loadTitlePage(scriptId: string): Promise<TitlePageSettings | null>,
    saveTitlePage(scriptId: string, settings: TitlePageSettings): Promise<void>,
    deleteTitlePage(scriptId: string): Promise<void>,
}
