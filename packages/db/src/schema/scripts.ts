import type {ScriptSummaryMetadata} from '@stagistic/script';
import {
    bigint,
    jsonb,
    pgTable,
    text,
} from 'drizzle-orm/pg-core';

export const scripts = pgTable('scripts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    activeBlockId: text('active_block_id'),
    summaryMetadata: jsonb('summary_metadata').$type<ScriptSummaryMetadata>(),
});

/*
 * syncOutbox: scriptId/opType/payloadJson/createdAt are intentionally nullable
 * so that INSERT never fails on partial records written by forward-compatible
 * schema versions (a future migration may add new op types with different fields).
 * Only `status` is NOT NULL because it drives queue polling.
 */
export const syncOutbox = pgTable('sync_outbox', {
    id: text('id').primaryKey(),
    scriptId: text('script_id'),
    opType: text('op_type'),
    payloadJson: text('payload_json'),
    createdAt: bigint('created_at', {mode: 'number'}),
    status: text('status').notNull().default('pending'),
});
