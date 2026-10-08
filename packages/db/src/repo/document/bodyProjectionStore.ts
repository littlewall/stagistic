import {buildScriptSummaryMetadata, type ScriptDocument} from '@stagistic/script';

import * as dbQueries from '../../queries';
import type {GetDb, SyncDb} from '../types';
import {createSqlScriptDocumentProjectionWriter, loadScriptDocumentFromProjection} from './documentProjection';

/**
 * Projection side of the sync engine: the Y.Doc body is the source of truth,
 * these tables are its cache (invariant 4: only the engine writes them).
 */
export interface ScriptBodyProjectionStore {
    /** Current projection (used once to seed a Y.Doc); also resets the write baseline. */
    loadDocument(scriptId: string): Promise<ScriptDocument | null>,
    /** Writes the delta against the baseline, bumps `updatedAt` and summary metadata on change. */
    writeDocument(scriptId: string, document: ScriptDocument): Promise<void>,
}

interface CreateScriptBodyProjectionStoreArgs {
    getDb: GetDb,
    syncDb: SyncDb,
}

export const createScriptBodyProjectionStore = ({getDb, syncDb}: CreateScriptBodyProjectionStoreArgs): ScriptBodyProjectionStore => {
    const writer = createSqlScriptDocumentProjectionWriter({getDb});
    const baselineReady = new Set<string>();

    const loadDocument: ScriptBodyProjectionStore['loadDocument'] = async scriptId => {
        const loaded = await loadScriptDocumentFromProjection(await getDb(), scriptId);

        baselineReady.add(scriptId);

        if (!loaded) {
            writer.seedBaseline(scriptId, {type: 'doc', content: []});

            return null;
        }

        writer.seedBaseline(scriptId, loaded.document, loaded.orderKeyByBlockId);

        return loaded.document;
    };

    const writeDocument: ScriptBodyProjectionStore['writeDocument'] = async (scriptId, document) => {
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

    return {loadDocument, writeDocument};
};
