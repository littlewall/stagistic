import {dbQueries} from '@stagistic/db';
import {
    type EditorSettingsOverride,
    LATEST_SCRIPT_SCHEMA_VERSION,
} from '@stagistic/script-core';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {normalizeSettingsBlockType} from './configBlockTypes';
import {
    buildConfigRows,
    hydrateBlockSettings,
    isScriptSettingsPayload,
} from './configRows';
import {parseJson} from './documentCodec';
import type {
    GetDb,
    RecordOutbox,
} from './types';

type ConfigHandlers = Pick<
    ScriptRepository,
    'loadScriptConfig' | 'saveScriptConfig' | 'deleteScriptConfig'
>;

interface CreateConfigHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}

export const createConfigHandlers = ({
    getDb,
    recordOutbox,
}: CreateConfigHandlersArgs): ConfigHandlers => {
    const loadScriptConfig: ConfigHandlers['loadScriptConfig'] = async (
        scriptId,
        namespace,
    ) => {
        const db = await getDb();
        const config = await dbQueries.getScriptConfigMeta(db, {scriptId, namespace});

        if (!config) {
            return null;
        }

        const blocks = await dbQueries.listScriptConfigBlocks(db, config.id);
        const parsedPayload = config.payloadJson ? parseJson(config.payloadJson) : null;
        const payload = isScriptSettingsPayload(parsedPayload) ? parsedPayload : {};
        const settings: EditorSettingsOverride = {
            ...payload,
            blocks: {},
        };

        const normalizedBlocks = [...blocks].sort((a, b) => {
            const aIsCanonical = normalizeSettingsBlockType(a.blockType) === a.blockType;
            const bIsCanonical = normalizeSettingsBlockType(b.blockType) === b.blockType;

            return Number(aIsCanonical) - Number(bIsCanonical);
        });

        normalizedBlocks.forEach(block => {
            hydrateBlockSettings(settings, block);
        });

        if (Object.keys(settings.blocks ?? {}).length === 0) {
            delete settings.blocks;
        }

        return settings;
    };

    const saveScriptConfig: ConfigHandlers['saveScriptConfig'] = async (
        scriptId,
        namespace,
        settings,
    ) => {
        const db = await getDb();
        const now = Date.now();
        const currentConfig = await dbQueries.getScriptConfigMeta(db, {scriptId, namespace});
        const configId = currentConfig?.id ?? uuidv7();
        const payloadJson = JSON.stringify({
            page: settings.page,
            typography: settings.typography,
            visual: settings.visual,
            structure: settings.structure,
        });
        const blockRows = buildConfigRows(settings, now);

        await db.transaction(async tx => {
            if (!currentConfig) {
                await dbQueries.insertScriptConfig(tx, {
                    id: configId,
                    scriptId,
                    namespace,
                    payloadJson,
                    createdAt: now,
                    updatedAt: now,
                    schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
                });
            }

            if (currentConfig) {
                await dbQueries.updateScriptConfig(tx, {
                    id: configId,
                    payloadJson,
                    updatedAt: now,
                    schemaVersion: LATEST_SCRIPT_SCHEMA_VERSION,
                });
            }

            await dbQueries.replaceScriptConfigBlocks(tx, {
                configId,
                rows: blockRows,
            });
        });

        await recordOutbox({
            scriptId,
            opType: 'config.save',
            payloadJson: JSON.stringify({
                scriptId,
                namespace,
                updatedAt: now,
            }),
        });
    };

    const deleteScriptConfig: ConfigHandlers['deleteScriptConfig'] = async (
        scriptId,
        namespace,
    ) => {
        const db = await getDb();

        await dbQueries.deleteScriptConfig(db, {scriptId, namespace});

        await recordOutbox({
            scriptId,
            opType: 'config.delete',
            payloadJson: JSON.stringify({
                scriptId,
                namespace,
                deletedAt: Date.now(),
            }),
        });
    };

    return {
        loadScriptConfig,
        saveScriptConfig,
        deleteScriptConfig,
    };
};
