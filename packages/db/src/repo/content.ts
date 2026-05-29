import {type ScriptDocument} from '@stagistic/script';

import * as dbQueries from '../queries';
import {rebuildScriptDocumentFromBlocks} from '../rewrite';
import type {ScriptRepository} from '../scriptRepository';

import {
    LEGACY_TO_BLOCKS_TRIGGERS,
    migrateScriptDocumentToBlocks,
} from './migration/legacyToBlocks';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

type ContentHandlers = {
    loadLatest: ScriptRepository['loadLatest'],
    saveLatest: ScriptRepository['saveLatest'],
};

interface CreateContentHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
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
            blockOrder: row.blockOrder,
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
    syncDb,
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

        // PGlite does not call syncToFs() after transaction COMMIT — the WAL
        // stays in memory until explicitly flushed. Without this, data is lost
        // on page refresh (the worker dies and the unflushed WAL disappears).
        await syncDb();
    };

    return {
        loadLatest,
        saveLatest,
    };
};
