import {convertDefaultScriptDocumentToLegacy, type ScriptDocument} from '@stagistic/script';

import {extractScriptBlocks, rebuildScriptDocumentFromBlocks} from '../blocks';
import * as dbQueries from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {createDocumentPersister} from './persist/persistDocumentDelta';
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

    return rebuilt.document;
};

export const createContentHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateContentHandlersArgs): ContentHandlers => {
    const persisters = new Map<string, ReturnType<typeof createDocumentPersister>>();

    const getPersister = (scriptId: string) => {
        let persister = persisters.get(scriptId);

        if (!persister) {
            persister = createDocumentPersister(scriptId);
            persisters.set(scriptId, persister);
        }

        return persister;
    };

    const loadLatest: ContentHandlers['loadLatest'] = async scriptId => {
        const db = await getDb();
        const document = await loadLatestFromBlocks(db, scriptId);

        if (document) {
            /*
             * Seed the diff baseline so the first autosave writes only the
             * editor's normalization delta (benign), not the whole document.
             */
            const baseline = extractScriptBlocks(scriptId, convertDefaultScriptDocumentToLegacy(document));

            getPersister(scriptId).setBaseline(baseline.blocks);
        }

        return document;
    };

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
        const db = await getDb();
        const now = Date.now();

        /*
         * Granular persist: diff the document against the last-saved blocks and
         * write only the delta (Case A content-only UPDATEs; Case B structural).
         */
        await getPersister(scriptId).persist(db, convertDefaultScriptDocumentToLegacy(value));

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

        /*
         * PGlite does not call syncToFs() after transaction COMMIT — the WAL
         * stays in memory until explicitly flushed. Without this, data is lost
         * on page refresh (the worker dies and the unflushed WAL disappears).
         */
        await syncDb();
    };

    return {
        loadLatest,
        saveLatest,
    };
};
