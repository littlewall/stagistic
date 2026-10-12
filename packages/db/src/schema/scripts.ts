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

