import {uuidv7} from '@stagistic/shared';

import type {FileStorage} from '../fileStorage';
import type {LocalDb} from '../pglite';
import * as dbQueries from '../queries';
import {
    createPgliteReactiveQuerySource,
    type ReactiveQuerySource,
} from '../reactive';
import type {
    ScriptEditorSettingsRecord,
    ScriptRepository,
    ScriptSceneLocationAssignment,
    ScriptTitlePageRecord,
} from '../scriptRepository';
import type {
    ScriptAttachment,
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptCue,
    ScriptCueAttachmentBinding,
    ScriptLocation,
} from '../types';
import {createAttachmentHandlers} from './attachments';
import {createCharacterHandlers} from './characters';
import {createSettingsHandlers} from './config';
import {createContentHandlers} from './content';
import {createCueHandlers} from './cues';
import {createLocationHandlers} from './locations';
import {createOutboxRecorder} from './outbox';
import {createScriptsHandlers} from './scripts';
import {createTitlePageHandlers} from './titlePage';
import type {GetDb} from './types';

export interface LocalPgliteRepositoryDeps {
    getLocalDb: () => Promise<LocalDb>,
    syncToFs: () => Promise<void>,
    fileStorage: FileStorage,
}

export const createLocalPgliteRepository = ({
    getLocalDb,
    syncToFs,
    fileStorage,
}: LocalPgliteRepositoryDeps): ScriptRepository => {
    const dbPromise = getLocalDb();

    const getDb: GetDb = async () => dbPromise;
    const recordOutbox = createOutboxRecorder(getDb);

    const scripts = createScriptsHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const characterSources = new Map<string, ReactiveQuerySource<ScriptCharacterRef>>();
    const characterGenderSources = new Map<
        string,
        ReactiveQuerySource<ScriptCharacterGenderOption>
    >();
    const cueSources = new Map<string, ReactiveQuerySource<ScriptCue>>();
    const locationSources = new Map<string, ReactiveQuerySource<ScriptLocation>>();
    const sceneLocationSources = new Map<
        string,
        ReactiveQuerySource<ScriptSceneLocationAssignment>
    >();
    const titlePageSources = new Map<string, ReactiveQuerySource<ScriptTitlePageRecord>>();
    const editorSettingsSources = new Map<
        string,
        ReactiveQuerySource<ScriptEditorSettingsRecord>
    >();
    const attachmentSources = new Map<string, ReactiveQuerySource<ScriptAttachment>>();
    const cueAttachmentBindingSources = new Map<
        string,
        ReactiveQuerySource<ScriptCueAttachmentBinding>
    >();
    const scriptSummaries = createPgliteReactiveQuerySource({
        getDb,
        readRows: () => scripts.list(),
        watchQuery: `
            SELECT id, title, subtitle, created_at, updated_at, active_block_id
            FROM scripts
        `,
    });
    const characterHandlers = createCharacterHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const content = createContentHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const settingsHandlers = createSettingsHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const titlePageHandlers = createTitlePageHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const cues = createCueHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const locations = createLocationHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
    });
    const getScriptCharactersSource = (scriptId: string) => {
        const existing = characterSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: () => listScriptCharacters(scriptId),
            watchQuery: `
                SELECT id, character_key, color_hex, gender_key, notes,
                    backstory, outline
                FROM script_characters
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        characterSources.set(scriptId, source);

        return source;
    };
    const getScriptCharacterGendersSource = (scriptId: string) => {
        const existing = characterGenderSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: () => characterHandlers.listScriptCharacterGenders(scriptId),
            watchQuery: `
                SELECT id, gender_key, gender_label
                FROM script_character_genders
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        characterGenderSources.set(scriptId, source);

        return source;
    };
    const getScriptCuesSource = (scriptId: string) => {
        const existing = cueSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: () => cues.list(scriptId),
            watchQuery: `
                SELECT id, script_id, scene_number, index_in_scene, mode, title,
                    kind, start_block_id, end_block_id, created_at, updated_at
                FROM script_cues
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        cueSources.set(scriptId, source);

        return source;
    };
    const getScriptLocationsSource = (scriptId: string) => {
        const existing = locationSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: () => locations.list(scriptId),
            watchQuery: `
                SELECT id, script_id, name, description, created_at, updated_at
                FROM script_locations
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        locationSources.set(scriptId, source);

        return source;
    };
    const getScriptSceneLocationsSource = (scriptId: string) => {
        const existing = sceneLocationSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: () => locations.listSceneAssignments(scriptId),
            watchQuery: `
                SELECT scene_id, location_id
                FROM script_scene_locations
                WHERE scene_id IN (
                    SELECT id FROM script_scenes WHERE script_id = $1
                )
            `,
            watchParams: [scriptId],
        });

        sceneLocationSources.set(scriptId, source);

        return source;
    };
    const getScriptTitlePageSource = (scriptId: string) => {
        const existing = titlePageSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource<ScriptTitlePageRecord>({
            getDb,
            readRows: async () => {
                const settings = await titlePageHandlers.load(scriptId);

                return settings ? [{scriptId, settings}] : [];
            },
            watchQuery: `
                SELECT script_id, source
                FROM (
                    SELECT script_id, 'field' AS source
                    FROM script_settings_title_page
                    UNION ALL
                    SELECT id AS script_id, 'subtitle' AS source
                    FROM scripts
                    WHERE subtitle IS NOT NULL
                ) AS title_page_records
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        titlePageSources.set(scriptId, source);

        return source;
    };
    const getScriptEditorSettingsSource = (scriptId: string) => {
        const existing = editorSettingsSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource<ScriptEditorSettingsRecord>({
            getDb,
            readRows: async () => {
                const settings = await settingsHandlers.loadScriptSettings(scriptId);

                return settings ? [{scriptId, settings}] : [];
            },
            watchQuery: `
                SELECT script_id, source
                FROM (
                    SELECT script_id, 'page' AS source FROM script_settings_page_layout
                    UNION ALL
                    SELECT script_id, 'visual' AS source FROM script_settings_visual_preferences
                    UNION ALL
                    SELECT script_id, 'structure' AS source FROM script_settings_structure
                    UNION ALL
                    SELECT script_id, 'initial-pages' AS source FROM script_settings_initial_pages
                    UNION ALL
                    SELECT script_id, 'header-footer' AS source FROM script_settings_headers_footers
                    UNION ALL
                    SELECT script_id, 'block' AS source FROM script_settings_blocks
                ) AS editor_settings_records
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        editorSettingsSources.set(scriptId, source);

        return source;
    };
    const getScriptAttachmentsSource = (scriptId: string) => {
        const existing = attachmentSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: async () => {
                const db = await getDb();

                return dbQueries.listScriptAttachments(db, scriptId);
            },
            watchQuery: `
                SELECT id, script_id, filename, mime_type, size_bytes,
                    storage_key, created_at, updated_at
                FROM script_attachments
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });

        attachmentSources.set(scriptId, source);

        return source;
    };
    const getScriptCueAttachmentBindingsSource = (scriptId: string) => {
        const existing = cueAttachmentBindingSources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createPgliteReactiveQuerySource({
            getDb,
            readRows: async () => {
                const db = await getDb();

                return dbQueries.listScriptCueAttachmentBindings(db, scriptId);
            },
            watchQuery: `
                SELECT binding.cue_id, binding.attachment_id, binding.role,
                    binding.sort_order, binding.created_at
                FROM script_cue_attachments AS binding
                INNER JOIN script_cues AS cue ON cue.id = binding.cue_id
                WHERE cue.script_id = $1
            `,
            watchParams: [scriptId],
        });

        cueAttachmentBindingSources.set(scriptId, source);

        return source;
    };
    const attachments = createAttachmentHandlers({
        getDb,
        recordOutbox,
        syncDb: syncToFs,
        fileStorage,
    });

    const listScriptCharacters = async (scriptId: string) => {
        const db = await getDb();

        return dbQueries.listScriptCharacters(db, scriptId);
    };

    return {
        scriptSummaries,
        allocateScriptId: uuidv7,
        allocateScriptCharacterId: uuidv7,
        allocateScriptCharacterGenderId: uuidv7,
        allocateScriptCueId: uuidv7,
        allocateScriptLocationId: uuidv7,
        getScriptCharactersSource,
        getScriptCharacterGendersSource,
        getScriptCuesSource,
        getScriptLocationsSource,
        getScriptSceneLocationsSource,
        getScriptTitlePageSource,
        getScriptEditorSettingsSource,
        getScriptAttachmentsSource,
        getScriptCueAttachmentBindingsSource,
        listScripts: options => scripts.list(options),
        getScriptSummary: scriptId => scripts.getSummary(scriptId),
        listScriptCharacters: scriptId => listScriptCharacters(scriptId),
        listScriptCharacterGenders: scriptId => characterHandlers.listScriptCharacterGenders(scriptId),
        listScriptCues: scriptId => cues.list(scriptId),
        createScriptCue: (scriptId, input) => cues.create(scriptId, input),
        createScriptCueWithId: (scriptId, input) => cues.createWithId(scriptId, input),
        updateScriptCue: (scriptId, cueId, input) => cues.update(scriptId, cueId, input),
        deleteScriptCue: (scriptId, cueId) => cues.delete(scriptId, cueId),
        listScriptLocations: scriptId => locations.list(scriptId),
        listScriptSceneLocations: scriptId => locations.listSceneAssignments(scriptId),
        createScriptLocation: (scriptId, input) => locations.create(scriptId, input),
        createScriptLocationWithId: (scriptId, input) => locations.createWithId(scriptId, input),
        renameScriptLocation: (scriptId, locationId, name) => locations.rename(scriptId, locationId, name),
        deleteScriptLocation: (scriptId, locationId) => locations.delete(scriptId, locationId),
        replaceScriptSceneLocations: (scriptId, sceneHeadingBlockId, locationIds) => {
            return locations.replaceSceneAssignments(
                scriptId,
                sceneHeadingBlockId,
                locationIds,
            );
        },
        createScript: (title, initialContent) => scripts.create(title, initialContent),
        createScriptWithId: input => scripts.createWithId(input),
        renameScript: (scriptId, input) => scripts.rename(scriptId, input),
        renameScriptTitle: (scriptId, title) => scripts.renameTitle(scriptId, title),
        duplicateScript: (sourceScriptId, input) => scripts.duplicate(sourceScriptId, input),
        duplicateScriptWithId: (sourceScriptId, input) => scripts.duplicateWithId(sourceScriptId, input),
        deleteScript: scriptId => scripts.delete(scriptId),
        setActiveBlock: (scriptId, blockId) => scripts.setActiveBlock(scriptId, blockId),
        confirmScriptCharacter: (scriptId, characterKey) => characterHandlers.confirmScriptCharacter(scriptId, characterKey),
        confirmScriptCharacterWithId: (scriptId, input) => {
            return characterHandlers.confirmScriptCharacterWithId(scriptId, input);
        },
        deleteScriptCharacter: (scriptId, characterId) => characterHandlers.deleteScriptCharacter(scriptId, characterId),
        renameScriptCharacter: (scriptId, characterId, nextCharacterKey) => characterHandlers.renameScriptCharacter(
            scriptId,
            characterId,
            nextCharacterKey,
        ),
        setScriptCharacterColor: (scriptId, characterId, colorHex) => characterHandlers.setScriptCharacterColor(
            scriptId,
            characterId,
            colorHex,
        ),
        setScriptCharacterGender: (scriptId, characterId, genderKey) => characterHandlers.setScriptCharacterGender(
            scriptId,
            characterId,
            genderKey,
        ),
        setScriptCharacterOutline: (scriptId, characterId, outline) => characterHandlers.setScriptCharacterOutline(
            scriptId,
            characterId,
            outline,
        ),
        upsertScriptCharacterGender: (scriptId, label) => characterHandlers.upsertScriptCharacterGender(scriptId, label),
        upsertScriptCharacterGenderWithId: (scriptId, input) => {
            return characterHandlers.upsertScriptCharacterGenderWithId(scriptId, input);
        },
        loadLatest: scriptId => content.loadLatest(scriptId),
        saveLatest: (scriptId, value) => content.saveLatest(scriptId, value),
        loadScriptSettings: scriptId => settingsHandlers.loadScriptSettings(scriptId),
        saveScriptSettings: (scriptId, settings) => settingsHandlers.saveScriptSettings(scriptId, settings),
        deleteScriptSettings: scriptId => settingsHandlers.deleteScriptSettings(scriptId),
        loadTitlePage: scriptId => titlePageHandlers.load(scriptId),
        saveTitlePage: (scriptId, settings) => titlePageHandlers.save(scriptId, settings),
        deleteTitlePage: scriptId => titlePageHandlers.delete(scriptId),
        getCueAttachment: (cueId, role) => attachments.getByCueRole(cueId, role),
        setCueAttachment: (scriptId, cueId, role, file) => attachments.setForCue(scriptId, cueId, role, file),
        removeCueAttachment: (scriptId, cueId, role) => attachments.removeFromCue(scriptId, cueId, role),
        getAttachmentBlob: storageKey => attachments.getBlob(storageKey),
    };
};
