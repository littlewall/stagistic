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
import {ScriptRevisionConflictError} from './scriptRevisionConflict';
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

    /*
     * Revision of each script's text as this tab last loaded or saved it. A save
     * from older text is refused in its own transaction, so a tab that lost its
     * edit lock, slept or runs an old build cannot overwrite newer text.
     */
    const knownRevisions = new Map<string, number>();

    const loadLatest: ContentHandlers['loadLatest'] = async scriptId => {
        const revision = await dbQueries.getScriptRevision(await getDb(), scriptId);
        const loaded = await documentSource.load(scriptId);

        // Revisions only grow; a save finishing meanwhile may already have recorded a newer one.
        if (revision !== null && revision > (knownRevisions.get(scriptId) ?? -1)) {
            knownRevisions.set(scriptId, revision);
        }

        if (!loaded) {
            return null;
        }

        return loaded.document;
    };

    const persistLatest: ContentHandlers['saveLatest'] = async (scriptId, value, metadata, expectedSettings) => {
        const now = Date.now();
        const derivedMetadata = metadata ?? buildScriptSummaryMetadata(value);

        /*
         * Granular persist: diff the document against the last-saved blocks and
         * write only the delta (Case A content-only UPDATEs; Case B structural).
         * Timestamp + outbox ride in the same transaction as the delta.
         */
        const saved: {revision: number | null} = {revision: null};

        await documentSource.save(scriptId, value, {
            beforePersist: async tx => {
                const expected = knownRevisions.get(scriptId);

                if (expected !== undefined && await dbQueries.getScriptRevision(tx, scriptId) !== expected) {
                    throw new ScriptRevisionConflictError(scriptId);
                }
            },
            afterPersist: async (tx, documentChanged) => {
                saved.revision = documentChanged ? await dbQueries.bumpScriptRevision(tx, scriptId) : null;

                const layoutMatches = expectedSettings === undefined
                    || getScriptLayoutFingerprint(await readScriptSettings(tx, scriptId)) === getScriptLayoutFingerprint(expectedSettings);
                const previousMetadata = (metadata?.pageCount === null || metadata?.pageCount === undefined) && !documentChanged && layoutMatches
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

        if (saved.revision !== null) {
            knownRevisions.set(scriptId, saved.revision);
        }

        /*
         * PGlite does not call syncToFs() after transaction COMMIT — the WAL
         * stays in memory until explicitly flushed. Without this, data is lost
         * on page refresh (the worker dies and the unflushed WAL disappears).
         */
        await syncDb();
    };

    /*
     * A failed save may have committed anyway, or committed on a leader that went
     * before storing it. Saves write only the difference to the last one, so a
     * retry trusting that baseline would write nothing and report success.
     */
    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value, metadata, expectedSettings) => {
        try {
            await persistLatest(scriptId, value, metadata, expectedSettings);
        } catch (error) {
            documentSource.forgetBaseline(scriptId);
            throw error;
        }
    };

    return {
        loadLatest,
        saveLatest,
        saveSummaryMetadata: createSaveSummaryMetadataHandler({getDb, syncDb}),
    };
};
