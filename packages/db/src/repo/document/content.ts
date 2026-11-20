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
    /*
     * Revision a failed save started from. It may have committed (one higher) or
     * been lost with the leader's tab (unchanged), so its retry accepts either.
     */
    const unsettledRevisions = new Map<string, number>();
    const matchesRevision = (scriptId: string, current: number | null) => {
        const expected = knownRevisions.get(scriptId);
        const unsettled = unsettledRevisions.get(scriptId);

        return expected === undefined
            || current === expected
            || (unsettled !== undefined && (current === unsettled || current === unsettled + 1));
    };

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

    const persistLatest = async (
        attempt: {startedFrom: number | null},
        ...[
            scriptId,
            value,
            metadata,
            expectedSettings,
        ]: Parameters<ContentHandlers['saveLatest']>
    ) => {
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
                const current = await dbQueries.getScriptRevision(tx, scriptId);

                if (!matchesRevision(scriptId, current)) {
                    throw new ScriptRevisionConflictError(scriptId);
                }

                attempt.startedFrom = current;
            },
            afterPersist: async (tx, documentChanged) => {
                if (documentChanged) {
                    saved.revision = await dbQueries.bumpScriptRevision(tx, scriptId);
                } else if (unsettledRevisions.has(scriptId)) {
                    // The stored text already equals this one, so its revision is the one this tab knows now.
                    saved.revision = await dbQueries.getScriptRevision(tx, scriptId);
                }

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
        unsettledRevisions.delete(scriptId);
    };

    /*
     * A failed save may have committed anyway, or committed on a leader that went
     * before storing it. Saves write only the difference to the last one, so a
     * retry trusting that baseline would write nothing and report success.
     */
    const saveLatest: ContentHandlers['saveLatest'] = async (scriptId, value, metadata, expectedSettings) => {
        const attempt: {startedFrom: number | null} = {startedFrom: null};

        try {
            await persistLatest(attempt, scriptId, value, metadata, expectedSettings);
        } catch (error) {
            documentSource.forgetBaseline(scriptId);

            if (attempt.startedFrom !== null) {
                unsettledRevisions.set(scriptId, attempt.startedFrom);
            }

            throw error;
        }
    };

    return {
        loadLatest,
        saveLatest,
        saveSummaryMetadata: createSaveSummaryMetadataHandler({getDb, syncDb}),
    };
};
