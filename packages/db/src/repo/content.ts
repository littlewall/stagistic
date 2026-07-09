import * as dbQueries from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {
    createProjectedTableDocumentSource,
    createSqlScriptDocumentProjectionWriter,
} from './documentProjection';
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

export const createContentHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateContentHandlersArgs): ContentHandlers => {
    const projectionWriter = createSqlScriptDocumentProjectionWriter({getDb});
    const documentSource = createProjectedTableDocumentSource({getDb, projectionWriter});

    const loadLatest: ContentHandlers['loadLatest'] = async scriptId => {
        const loaded = await documentSource.load(scriptId);

        if (!loaded) {
            return null;
        }

        return loaded.document;
    };

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value) => {
        const now = Date.now();
        const perfEnabled = isPerfLoggingEnabled();
        const startedAt = perfEnabled ? performance.now() : 0;

        /*
         * Granular persist: diff the document against the last-saved blocks and
         * write only the delta (Case A content-only UPDATEs; Case B structural).
         * Timestamp + outbox ride in the same transaction as the delta.
         */
        await documentSource.save(scriptId, value, {
            afterPersist: async tx => {
                await dbQueries.updateScriptTimestamp(tx, {
                    scriptId,
                    updatedAt: now,
                });

                await recordOutbox({
                    scriptId,
                    opType: 'latest.save',
                    payloadJson: JSON.stringify({scriptId, updatedAt: now}),
                }, tx);
            },
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
