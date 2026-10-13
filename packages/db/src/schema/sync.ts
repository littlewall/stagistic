import {
    bigint,
    boolean,
    integer,
    pgTable,
    text,
} from 'drizzle-orm/pg-core';

/*
 * Local cloud-sync state (drizzle/0026). Written only by the sync engine;
 * see `repo/sync/cloudSyncStore.ts`.
 */

export const syncAccount = pgTable('sync_account', {
    id: integer('id').primaryKey(),
    accountId: text('account_id').notNull(),
    email: text('email').notNull(),
    checked: boolean('checked').notNull().default(false),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
});

export const syncState = pgTable('sync_state', {
    scriptId: text('script_id').primaryKey(),
    accountId: text('account_id').notNull(),
    bodyStateVector: text('body_state_vector'),
    metaStateVector: text('meta_state_vector'),
    commentsStateVector: text('comments_state_vector'),
    syncedAt: bigint('synced_at', {mode: 'number'}).notNull(),
});

export const syncTombstones = pgTable('sync_tombstones', {
    scriptId: text('script_id').primaryKey(),
    accountId: text('account_id').notNull(),
    deletedAt: bigint('deleted_at', {mode: 'number'}).notNull(),
});
