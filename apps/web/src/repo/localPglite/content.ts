import {
    dbQueries,
    rebuildScriptDocumentFromBlocks,
    type ScriptRepository,
} from '@stagistic/db';
import {type ScriptDocument} from '@stagistic/script';

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

    return {
        loadLatest,
        saveLatest,
    };
};
