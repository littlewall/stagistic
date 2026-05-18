import {dbQueries} from '@stagistic/db';
import type {ScriptTitlePageRepository} from '@stagistic/db';
import type {TitlePageSettings} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import type {
    GetDb,
    RecordOutbox,
} from './types';

const TITLE_PAGE_NAMESPACE = 'title-page';
const TITLE_PAGE_SCHEMA_VERSION = 1;

const isTitlePageSettings = (value: unknown): value is TitlePageSettings => {
    return typeof value === 'object' && value !== null;
};

interface CreateTitlePageHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}

export const createTitlePageHandlers = ({
    getDb,
    recordOutbox,
}: CreateTitlePageHandlersArgs): ScriptTitlePageRepository => {
    const load: ScriptTitlePageRepository['load'] = async (scriptId) => {
        const db = await getDb();
        const config = await dbQueries.getScriptConfigMeta(db, {
            scriptId,
            namespace: TITLE_PAGE_NAMESPACE,
        });

        if (!config?.payloadJson) {
            return null;
        }

        try {
            const parsed: unknown = JSON.parse(config.payloadJson);

            return isTitlePageSettings(parsed) ? parsed : null;
        } catch {
            return null;
        }
    };

    const save: ScriptTitlePageRepository['save'] = async (scriptId, settings) => {
        const db = await getDb();
        const now = Date.now();
        const currentConfig = await dbQueries.getScriptConfigMeta(db, {
            scriptId,
            namespace: TITLE_PAGE_NAMESPACE,
        });
        const configId = currentConfig?.id ?? uuidv7();
        const payloadJson = JSON.stringify(settings);

        if (!currentConfig) {
            await dbQueries.insertScriptConfig(db, {
                id: configId,
                scriptId,
                namespace: TITLE_PAGE_NAMESPACE,
                payloadJson,
                createdAt: now,
                updatedAt: now,
                schemaVersion: TITLE_PAGE_SCHEMA_VERSION,
            });
        } else {
            await dbQueries.updateScriptConfig(db, {
                id: configId,
                payloadJson,
                updatedAt: now,
                schemaVersion: TITLE_PAGE_SCHEMA_VERSION,
            });
        }

        await recordOutbox({
            scriptId,
            opType: 'title-page.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
        });
    };

    const deleteTitlePage: ScriptTitlePageRepository['delete'] = async (scriptId) => {
        const db = await getDb();

        await dbQueries.deleteScriptConfig(db, {
            scriptId,
            namespace: TITLE_PAGE_NAMESPACE,
        });

        await recordOutbox({
            scriptId,
            opType: 'title-page.delete',
            payloadJson: JSON.stringify({scriptId, deletedAt: Date.now()}),
        });
    };

    return {
        load,
        save,
        delete: deleteTitlePage,
    };
};
