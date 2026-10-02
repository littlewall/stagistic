import {buildScriptSummaryMetadata} from '@stagistic/script';

import * as dbQueries from '../../queries';
import type {ScriptRepository} from '../../types/scriptRepository';
import {readScriptSettings} from '../config/config';
import {getScriptLayoutFingerprint} from '../config/layoutFingerprint';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from '../types';
import {createProjectedTableDocumentSource, createSqlScriptDocumentProjectionWriter} from './documentProjection';
import {createSaveSummaryMetadataHandler} from './summaryMetadata';

type ContentHandlers = {
    loadLatest: ScriptRepository['loadLatest'],
    saveLatest: ScriptRepository['saveLatest'],
    saveSummaryMetadata: ScriptRepository['saveSummaryMetadata'],
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

    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value, metadata, expectedSettings) => {
        const now = Date.now();
        const derivedMetadata = metadata ?? buildScriptSummaryMetadata(value);

        /*
         * Granular persist: diff the document against the last-saved blocks and
         * write only the delta (Case A content-only UPDATEs; Case B structural).
         * Timestamp + outbox ride in the same transaction as the delta.
         */
        await documentSource.save(scriptId, value, {
            afterPersist: async (tx, documentChanged) => {
                const layoutMatches = expectedSettings === undefined
                    || getScriptLayoutFingerprint(await readScriptSettings(tx, scriptId)) === getScriptLayoutFingerprint(expectedSettings);
                const previousMetadata = metadata?.pageCount == null && !documentChanged && layoutMatches
                    ? (await dbQueries.getScriptSummary(tx, scriptId))?.summaryMetadata
                    : null;

                await dbQueries.updateScriptSummaryMetadata(tx, {
                    scriptId,
                    updatedAt: now,
                    summaryMetadata: {
                        ...derivedMetadata,
                        pageCount: layoutMatches ? previousMetadata?.pageCount ?? derivedMetadata.pageCount : null,
                    },
                });

                await recordOutbox(
                    {
                        scriptId,
                        entityKey: `script:${scriptId}:document`,
                        opType: 'latest.save',
                        occurredAt: now,
                        payloadJson: JSON.stringify({scriptId, updatedAt: now}),
                    },
                    tx,
                );
            },
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
        saveSummaryMetadata: createSaveSummaryMetadataHandler({getDb, syncDb}),
    };
};
