import {buildScriptSummaryMetadata} from '@stagistic/script';
import type {ProjectionStore} from '@stagistic/sync-engine';

import * as dbQueries from '../../queries';
import {readScriptRecords} from '../records/readScriptRecords';
import {writeScriptRecords} from '../records/writeScriptRecords';
import type {GetDb, SyncDb} from '../types';
import {createSqlScriptDocumentProjectionWriter, loadScriptDocumentFromProjection} from './documentProjection';

/**
 * Projection side of the sync engine: the Y.Docs are the source of truth,
 * these tables are their cache (invariant 4).
 * - `loadDocument` (seed) also resets the body write baseline
 * - `writeDocument` writes the delta, bumps `updatedAt` and summary metadata on change
 * - records: see `repo/records`
 */
interface CreateScriptProjectionStoreArgs {
    getDb: GetDb,
    syncDb: SyncDb,
}

export const createScriptProjectionStore = ({getDb, syncDb}: CreateScriptProjectionStoreArgs): ProjectionStore => {
    const writer = createSqlScriptDocumentProjectionWriter({getDb});
    const baselineReady = new Set<string>();

    const loadDocument: ProjectionStore['loadDocument'] = async scriptId => {
        const loaded = await loadScriptDocumentFromProjection(await getDb(), scriptId);

        baselineReady.add(scriptId);

        if (!loaded) {
            writer.seedBaseline(scriptId, {type: 'doc', content: []});

            return null;
        }

        writer.seedBaseline(scriptId, loaded.document, loaded.orderKeyByBlockId);

        return loaded.document;
    };

    const writeDocument: ProjectionStore['writeDocument'] = async (scriptId, document) => {
        if (!baselineReady.has(scriptId)) {
            await loadDocument(scriptId);
        }

        await writer.updateFromDocument(scriptId, document, {
            afterPersist: async (tx, documentChanged) => {
                if (!documentChanged) {
                    return;
                }

                // Page count needs the editor's layout; the tab fills it in via saveSummaryMetadata.
                await dbQueries.updateScriptSummaryMetadata(tx, {
                    scriptId,
                    updatedAt: Date.now(),
                    summaryMetadata: buildScriptSummaryMetadata(document),
                });
            },
        });

        await syncDb();
    };

    return {
        loadDocument,
        writeDocument,
        loadRecords: async (scriptId, kind) => readScriptRecords(await getDb(), scriptId, kind),
        writeRecords: async (scriptId, kind, upserts) => {
            const db = await getDb();
            const changed = await db.transaction(tx => writeScriptRecords(tx, scriptId, kind, upserts));

            if (changed) {
                await syncDb();
            }
        },
    };
};
