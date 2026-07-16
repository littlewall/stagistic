import * as dbQueries from '../queries';
import {
    createPgliteReactiveQuerySource,
    type ReactiveQuerySource,
} from '../reactive';
import type {
    ScriptEditorSettingsRecord,
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
    ScriptSummary,
} from '../types';
import type {GetDb} from './types';

interface CreateLocalPgliteReactiveSourcesArgs {
    getDb: GetDb,
    listScripts: () => Promise<ScriptSummary[]>,
    listCharacters: (scriptId: string) => Promise<ScriptCharacterRef[]>,
    listCharacterGenders: (scriptId: string) => Promise<ScriptCharacterGenderOption[]>,
    listCues: (scriptId: string) => Promise<ScriptCue[]>,
    listLocations: (scriptId: string) => Promise<ScriptLocation[]>,
    listSceneLocations: (scriptId: string) => Promise<ScriptSceneLocationAssignment[]>,
    loadTitlePage: (scriptId: string) => Promise<ScriptTitlePageRecord['settings'] | null>,
    loadEditorSettings: (
        scriptId: string,
    ) => Promise<ScriptEditorSettingsRecord['settings'] | null>,
}

const createScriptSourceRegistry = <T>(
    createSource: (scriptId: string) => ReactiveQuerySource<T>,
) => {
    const sources = new Map<string, ReactiveQuerySource<T>>();

    return (scriptId: string) => {
        const existing = sources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createSource(scriptId);

        sources.set(scriptId, source);

        return source;
    };
};

export const createLocalPgliteReactiveSources = ({
    getDb,
    listScripts,
    listCharacters,
    listCharacterGenders,
    listCues,
    listLocations,
    listSceneLocations,
    loadTitlePage,
    loadEditorSettings,
}: CreateLocalPgliteReactiveSourcesArgs) => {
    const scriptSummaries = createPgliteReactiveQuerySource({
        getDb,
        readRows: listScripts,
        watchQuery: `
            SELECT id, title, subtitle, created_at, updated_at, active_block_id
            FROM scripts
        `,
    });
    const getScriptCharactersSource = createScriptSourceRegistry(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: () => listCharacters(scriptId),
            watchQuery: `
                SELECT id, character_key, color_hex, gender_key, notes,
                    backstory, outline
                FROM script_characters
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });
    });
    const getScriptCharacterGendersSource = createScriptSourceRegistry(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: () => listCharacterGenders(scriptId),
            watchQuery: `
                SELECT id, gender_key, gender_label
                FROM script_character_genders
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });
    });
    const getScriptCuesSource = createScriptSourceRegistry(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: () => listCues(scriptId),
            watchQuery: `
                SELECT id, script_id, scene_number, index_in_scene, mode, title,
                    kind, start_block_id, end_block_id, created_at, updated_at
                FROM script_cues
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });
    });
    const getScriptLocationsSource = createScriptSourceRegistry(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: () => listLocations(scriptId),
            watchQuery: `
                SELECT id, script_id, name, description, created_at, updated_at
                FROM script_locations
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });
    });
    const getScriptSceneLocationsSource = createScriptSourceRegistry(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: () => listSceneLocations(scriptId),
            watchQuery: `
                SELECT scene_id, location_id
                FROM script_scene_locations
                WHERE scene_id IN (
                    SELECT id FROM script_scenes WHERE script_id = $1
                )
            `,
            watchParams: [scriptId],
        });
    });
    const getScriptTitlePageSource = createScriptSourceRegistry<ScriptTitlePageRecord>(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: async () => {
                const settings = await loadTitlePage(scriptId);

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
    });
    const getScriptEditorSettingsSource = createScriptSourceRegistry<ScriptEditorSettingsRecord>(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: async () => {
                const settings = await loadEditorSettings(scriptId);

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
    });
    const getScriptAttachmentsSource = createScriptSourceRegistry<ScriptAttachment>(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: async () => dbQueries.listScriptAttachments(await getDb(), scriptId),
            watchQuery: `
                SELECT id, script_id, filename, mime_type, size_bytes,
                    storage_key, created_at, updated_at
                FROM script_attachments
                WHERE script_id = $1
            `,
            watchParams: [scriptId],
        });
    });
    const getScriptCueAttachmentBindingsSource = createScriptSourceRegistry<
        ScriptCueAttachmentBinding
    >(scriptId => {
        return createPgliteReactiveQuerySource({
            getDb,
            readRows: async () => dbQueries.listScriptCueAttachmentBindings(
                await getDb(),
                scriptId,
            ),
            watchQuery: `
                SELECT binding.cue_id, binding.attachment_id, binding.role,
                    binding.sort_order, binding.created_at
                FROM script_cue_attachments AS binding
                INNER JOIN script_cues AS cue ON cue.id = binding.cue_id
                WHERE cue.script_id = $1
            `,
            watchParams: [scriptId],
        });
    });

    return {
        scriptSummaries,
        getScriptCharactersSource,
        getScriptCharacterGendersSource,
        getScriptCuesSource,
        getScriptLocationsSource,
        getScriptSceneLocationsSource,
        getScriptTitlePageSource,
        getScriptEditorSettingsSource,
        getScriptAttachmentsSource,
        getScriptCueAttachmentBindingsSource,
    };
};
