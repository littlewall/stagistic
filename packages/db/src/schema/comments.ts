import {
    bigint,
    index,
    pgTable,
    text,
} from 'drizzle-orm/pg-core';

import {scripts} from './scripts';

export const scriptCommentThreads = pgTable(
    'script_comment_threads',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        anchorKind: text('anchor_kind').notNull(),
        anchorBlockId: text('anchor_block_id'),
        quotedText: text('quoted_text').notNull().default(''),
        status: text('status').notNull().default('open'),
        resolvedAt: bigint('resolved_at', {mode: 'number'}),
        resolvedBy: text('resolved_by'),
        createdBy: text('created_by').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_comment_threads_script_id_idx').on(table.scriptId),
    }),
);

/*
 * Flat replies of a comment thread (first row = root message). script_id is
 * denormalized so reactive sources can watch by script without a join.
 */
export const scriptCommentMessages = pgTable(
    'script_comment_messages',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        threadId: text('thread_id')
            .notNull()
            .references(() => scriptCommentThreads.id, {onDelete: 'cascade'}),
        authorId: text('author_id').notNull(),
        body: text('body').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
        editedAt: bigint('edited_at', {mode: 'number'}),
    },
    table => ({
        threadCreatedIdx: index('script_comment_messages_thread_created_idx').on(table.threadId, table.createdAt),
        scriptIdIdx: index('script_comment_messages_script_id_idx').on(table.scriptId),
    }),
);
