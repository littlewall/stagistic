import {
    type RecordsKind,
    type RecordUpserts,
    recordValuesEqual,
} from '@stagistic/sync-engine';

import type {DbClient} from '../../queries';
import * as dbQueries from '../../queries';
import {readScriptRecords} from './readScriptRecords';
import {
    writeCharacters,
    writeGenders,
    writeScript,
} from './writers/characterWriters';
import {writeMessages, writeThreads} from './writers/commentWriters';
import {writeSettings, writeTitlePage} from './writers/configWriters';
import {
    writeAttachments,
    writeMusic,
    writeMusicAttachments,
} from './writers/musicWriters';
import {writeLocations, writeScenes} from './writers/placeWriters';
import type {Upserts, WriteContext} from './writers/shared';

/*
 * Records -> projection rows, written by the sync engine only. Rows whose
 * parent is missing (deleted concurrently, scene not projected yet) or whose
 * unique key is taken (duplicate pending a merge) are skipped; the engine
 * re-writes them once the doc settles.
 */

const WRITERS: Record<RecordsKind, Array<[collection: string, write: (context: WriteContext, upserts: Upserts) => Promise<void>]>> = {
    meta: [
        ['titlePage', writeTitlePage],
        ['script', writeScript],
        ['genders', writeGenders],
        ['locations', writeLocations],
        ['characters', writeCharacters],
        ['scenes', writeScenes],
        ['music', writeMusic],
        ['attachments', writeAttachments],
        ['musicAttachments', writeMusicAttachments],
        ['settings', writeSettings],
    ],
    comments: [
        ['threads', writeThreads],
        ['messages', writeMessages],
    ],
};

/**
 * Writes changed records; unchanged ones (already projected by the repository
 * mutation that produced them) are skipped. Returns whether anything changed.
 */
export const writeScriptRecords = async (tx: DbClient, scriptId: string, kind: RecordsKind, upserts: RecordUpserts, now = Date.now()) => {
    const current = await readScriptRecords(tx, scriptId, kind, Object.keys(upserts));
    let changed = false;

    for (const [collection, write] of WRITERS[kind]) {
        const pending = Object.fromEntries(Object.entries(upserts[collection] ?? {})
            .filter(([id, record]) => !recordValuesEqual(current[collection]?.[id] ?? null, record)));

        if (Object.keys(pending).length > 0) {
            await write({
                tx,
                scriptId,
                now,
            }, pending);
            changed = true;
        }
    }

    if (changed) {
        await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
    }

    return changed;
};
