import type {CloudSyncStore} from '@stagistic/sync-engine';
import {
    and,
    eq,
    isNull,
} from 'drizzle-orm';

import {
    scriptAttachments,
    scripts,
    syncAccount,
    syncAttachments,
    syncState,
    syncTombstones,
} from '../../schema';
import {createScriptsHandlers} from '../scripts';
import type {GetDb, SyncDb} from '../types';

/** Single row of `sync_account`. */
const ACCOUNT_ROW = 1;

/**
 * Cloud-sync bookkeeping in PGlite for the leader's engine (see
 * `@stagistic/sync-engine` `CloudSyncStore`). Only the engine writes it.
 */
export const createCloudSyncStore = ({getDb, syncDb}: {getDb: GetDb, syncDb: SyncDb}): CloudSyncStore => {
    const scriptHandlers = createScriptsHandlers({getDb, syncDb});
    const write = async (task: (db: Awaited<ReturnType<GetDb>>) => Promise<unknown>) => {
        await task(await getDb());
        await syncDb();
    };

    return {
        getAccount: async () => {
            const [row] = await (await getDb()).select().from(syncAccount).where(eq(syncAccount.id, ACCOUNT_ROW));

            return row ? {
                accountId: row.accountId,
                email: row.email,
                checked: row.checked,
            } : null;
        },
        setAccount: account => write(db => db
            .insert(syncAccount)
            .values({
                id: ACCOUNT_ROW,
                ...account,
                updatedAt: Date.now(),
            })
            .onConflictDoUpdate({target: syncAccount.id, set: {...account, updatedAt: Date.now()}})),
        clearAccount: () => write(db => db.delete(syncAccount)),
        listLocalScripts: async () => {
            const rows = await (await getDb()).select({
                id: scripts.id,
                title: scripts.title,
                updatedAt: scripts.updatedAt,
            }).from(scripts);

            return rows.map(row => ({
                scriptId: row.id,
                title: row.title,
                updatedAt: row.updatedAt,
            }));
        },
        listSyncStates: async () => {
            const rows = await (await getDb()).select().from(syncState);

            return rows.map(row => ({
                scriptId: row.scriptId,
                accountId: row.accountId,
                stateVectors: {
                    body: row.bodyStateVector,
                    meta: row.metaStateVector,
                    comments: row.commentsStateVector,
                },
                syncedAt: row.syncedAt,
            }));
        },
        setSyncState: state => {
            const fields = {
                accountId: state.accountId,
                bodyStateVector: state.stateVectors.body,
                metaStateVector: state.stateVectors.meta,
                commentsStateVector: state.stateVectors.comments,
                syncedAt: state.syncedAt,
            };

            return write(db => db
                .insert(syncState)
                .values({scriptId: state.scriptId, ...fields})
                .onConflictDoUpdate({target: syncState.scriptId, set: fields}));
        },
        clearSyncState: scriptId => write(db => db.delete(syncState).where(eq(syncState.scriptId, scriptId))),
        listTombstones: async () => (await getDb()).select().from(syncTombstones),
        addTombstone: (scriptId, accountId) => write(db => db
            .insert(syncTombstones)
            .values({
                scriptId,
                accountId,
                deletedAt: Date.now(),
            })
            .onConflictDoNothing()),
        removeTombstone: scriptId => write(db => db.delete(syncTombstones).where(eq(syncTombstones.scriptId, scriptId))),
        createScriptShell: (scriptId, title) => write(db => db
            .insert(scripts)
            .values({
                id: scriptId,
                title,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            })
            .onConflictDoNothing()),
        duplicateScript: (sourceScriptId, targetScriptId, title) => scriptHandlers.duplicateWithId(sourceScriptId, {
            targetScriptId,
            title,
            copySettings: true,
            copyAttributes: true,
        }),
        deleteScript: async scriptId => {
            await scriptHandlers.delete(scriptId);
            await write(db => db.delete(syncAttachments).where(eq(syncAttachments.scriptId, scriptId)));
        },
        listPendingUploads: async scriptId => {
            const rows = await (await getDb())
                .select({
                    attachmentId: scriptAttachments.id,
                    storageKey: scriptAttachments.storageKey,
                    mimeType: scriptAttachments.mimeType,
                    sizeBytes: scriptAttachments.sizeBytes,
                })
                .from(scriptAttachments)
                .leftJoin(syncAttachments, eq(syncAttachments.attachmentId, scriptAttachments.id))
                .where(and(eq(scriptAttachments.scriptId, scriptId), isNull(syncAttachments.attachmentId)));

            return rows;
        },
        markAttachmentUploaded: (attachmentId, scriptId) => write(db => db
            .insert(syncAttachments)
            .values({
                attachmentId,
                scriptId,
                uploadedAt: Date.now(),
            })
            .onConflictDoNothing()),
        findAttachment: async storageKey => {
            const [row] = await (await getDb())
                .select({
                    attachmentId: scriptAttachments.id,
                    scriptId: scriptAttachments.scriptId,
                    sha256: scriptAttachments.sha256,
                })
                .from(scriptAttachments)
                .where(eq(scriptAttachments.storageKey, storageKey))
                .limit(1);

            return row ?? null;
        },
    };
};
