import type {ScriptDocument} from '@stagistic/script';

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

/*
 * Opt-in save timing: localStorage.setItem('stagistic:perf', '1').
 * Evaluated lazily — this module also runs in node tests without localStorage.
 */
const isPerfLoggingEnabled = (): boolean => {
    try {
        return typeof localStorage !== 'undefined' && localStorage.getItem('stagistic:perf') === '1';
    } catch {
        return false;
    }
};

interface CreateContentHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
}

const loadLatestFromBlocks = async (
    db: Awaited<ReturnType<GetDb>>,
    scriptId: string,
): Promise<{document: ScriptDocument, orderKeyByBlockId: Map<string, string>} | null> => {
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

    return {
        document: rebuilt.document,
        orderKeyByBlockId: new Map(storedBlocks.map(row => [row.id, row.blockOrder])),
    };
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
        const loaded = await loadLatestFromBlocks(db, scriptId);

        if (!loaded) {
            return null;
        }

        /*
         * Seed the diff baseline so the first autosave writes only the
         * editor's normalization delta (benign), not the whole document.
         * Stored block orders seed the re-key baseline so a structural save
         * right after load touches only the moved blocks.
         */
        const baseline = extractScriptBlocks(scriptId, loaded.document);

        getPersister(scriptId).setBaseline(baseline.blocks, loaded.orderKeyByBlockId);

        return loaded.document;
    };

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
        const db = await getDb();
        const now = Date.now();
        const perfEnabled = isPerfLoggingEnabled();
        const startedAt = perfEnabled ? performance.now() : 0;

        /*
         * Granular persist: diff the document against the last-saved blocks and
         * write only the delta (Case A content-only UPDATEs; Case B structural).
         * Timestamp + outbox ride in the same transaction as the delta.
         */
        await getPersister(scriptId).persist(db, value, async tx => {
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

        const persistDoneAt = perfEnabled ? performance.now() : 0;

        /*
         * PGlite does not call syncToFs() after transaction COMMIT — the WAL
         * stays in memory until explicitly flushed. Without this, data is lost
         * on page refresh (the worker dies and the unflushed WAL disappears).
         */
        await syncDb();

        if (perfEnabled) {
            const syncDoneAt = performance.now();

            console.debug(
                `[db-local] saveLatest ${scriptId}: persist ${Math.round(persistDoneAt - startedAt)}ms, `
                + `syncToFs ${Math.round(syncDoneAt - persistDoneAt)}ms, total ${Math.round(syncDoneAt - startedAt)}ms`,
            );
        }
    };

    return {
        loadLatest,
        saveLatest,
    };
};
