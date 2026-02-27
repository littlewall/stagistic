import {
    dbQueries,
    rebuildScriptDocumentFromBlocks,
} from '@stagistic/db';
import {type ScriptDocument} from '@stagistic/script-core';
import {uuidv7} from '@stagistic/shared';
import type {ScriptRepository} from '@stagistic/sync-core';

import {
    LEGACY_TO_BLOCKS_TRIGGERS,
    migrateScriptDocumentToBlocks,
} from './migration/legacyToBlocks';
import type {
    GetDb,
    RecordOutbox,
} from './types';

type ContentHandlers = {
    loadLatest: ScriptRepository['loadLatest'],
    saveLatest: ScriptRepository['saveLatest'],
    loadVersion: NonNullable<ScriptRepository['loadVersion']>,
    commitVersion: ScriptRepository['commitVersion'],
    restoreLatestFromVersion: NonNullable<ScriptRepository['restoreLatestFromVersion']>,
};

interface CreateContentHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}

const loadLatestFromBlocks = async (
    db: Awaited<ReturnType<GetDb>>,
    scriptId: string,
): Promise<ScriptDocument | null> => {
    const storedBlocks = await dbQueries.listScriptBlocks(db, scriptId);

    if (storedBlocks.length === 0) {
        return null;
    }

    const storedCharacterRefs = await dbQueries.listScriptCharacterRefsByScript(db, scriptId);
    const rebuilt = rebuildScriptDocumentFromBlocks(
        scriptId,
        storedBlocks.map(row => ({
            id: row.id,
            blockType: row.blockType,
            orderNo: row.orderNo,
            textContent: row.textContent,
            contentJson: row.contentJson,
            columnGroupId: row.columnGroupId,
            columnIndex: row.columnIndex,
        })),
        storedCharacterRefs.map(ref => ({
            blockId: ref.blockId,
            characterKey: ref.characterKey,
            characterId: ref.characterId,
        })),
    );

    rebuilt.warnings.forEach(warning => {
        console.warn(`[db-local] ${warning}`);
    });

    return rebuilt.document as ScriptDocument;
};

const persistBlocksFromDocument = async (
    db: Awaited<ReturnType<GetDb>>,
    scriptId: string,
    value: ScriptDocument,
    trigger: typeof LEGACY_TO_BLOCKS_TRIGGERS.saveLatest,
) => {
    await migrateScriptDocumentToBlocks({
        db,
        scriptId,
        sourceDocument: value,
        trigger,
        context: trigger,
    });
};

export const createContentHandlers = ({
    getDb,
    recordOutbox,
}: CreateContentHandlersArgs): ContentHandlers => {
    const loadLatest: ContentHandlers['loadLatest'] = async scriptId => {
        const db = await getDb();

        return loadLatestFromBlocks(db, scriptId);
    };

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
        const db = await getDb();
        const now = Date.now();

        await persistBlocksFromDocument(
            db,
            scriptId,
            value,
            LEGACY_TO_BLOCKS_TRIGGERS.saveLatest,
        );

        await db.transaction(async tx => {
            await dbQueries.updateScriptTimestamp(tx, {
                scriptId,
                updatedAt: now,
            });

            await recordOutbox({
                scriptId,
                opType: 'latest.save',
                payloadJson: JSON.stringify({scriptId, updatedAt: now}),
            }, tx);
        });
    };

    const loadVersion: ContentHandlers['loadVersion'] = versionId => {
        void versionId;
        console.warn('[db-local] loadVersion is unavailable after legacy table cleanup.');

        return Promise.resolve(null);
    };

    const commitVersion: ContentHandlers['commitVersion'] = async (scriptId, message) => {
        const db = await getDb();
        const versionId = uuidv7();
        const now = Date.now();

        await dbQueries.updateScriptTimestamp(db, {
            scriptId,
            updatedAt: now,
        });

        await recordOutbox({
            scriptId,
            opType: 'version.commit',
            payloadJson: JSON.stringify({
                scriptId,
                versionId,
                message: message ?? null,
                createdAt: now,
                mode: 'scene_versions_only',
            }),
        });

        return versionId;
    };

    const restoreLatestFromVersion: ContentHandlers['restoreLatestFromVersion'] = (
        scriptId,
        versionId,
    ) => {
        void scriptId;
        void versionId;
        console.warn('[db-local] restoreLatestFromVersion is unavailable after legacy table cleanup.');

        return Promise.resolve();
    };

    return {
        loadLatest,
        saveLatest,
        loadVersion,
        commitVersion,
        restoreLatestFromVersion,
    };
};
