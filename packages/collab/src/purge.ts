import type {AttachmentStorage} from './attachmentStorage';
import type {CollabDatabase} from './database';

export const PURGE_AFTER_DAYS = 30;

/**
 * Deletes scripts soft-deleted more than `afterDays` ago with their members,
 * Y.Doc states, projected rows and attachment blobs. Returns ids.
 */
export const purgeDeletedScripts = async (database: CollabDatabase, afterDays = PURGE_AFTER_DAYS, attachments?: AttachmentStorage) => {
    const {rows} = await database.collab.query<{id: string}>(
        'delete from scripts where deleted_at < now() - make_interval(days => $1) returning id',
        [afterDays],
    );
    const ids = rows.map(row => row.id);

    if (ids.length > 0) {
        await database.projection.query('delete from scripts where id = any($1)', [ids]);
    }

    for (const id of ids) {
        await attachments?.deleteScript(id);
    }

    return ids;
};
