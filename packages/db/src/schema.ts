import {
    bigint,
    index,
    integer,
    pgTable,
    text,
} from 'drizzle-orm/pg-core';

export const scripts = pgTable('scripts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    activeBlockId: text('active_block_id'),
});

export const scriptLatest = pgTable('script_latest', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    contentJson: text('content_json').notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
});

export const scriptVersions = pgTable(
    'script_versions',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        message: text('message'),
        contentJson: text('content_json').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        schemaVersion: integer('schema_version').notNull().default(1),
    },
    table => ({
        scriptIdCreatedAtIdx: index('script_versions_script_id_created_at_idx')
            .on(table.scriptId, table.createdAt),
    }),
);

export const syncOutbox = pgTable('sync_outbox', {
    id: text('id').primaryKey(),
    scriptId: text('script_id'),
    opType: text('op_type'),
    payloadJson: text('payload_json'),
    createdAt: bigint('created_at', {mode: 'number'}),
    status: text('status').notNull().default('pending'),
});

export const dbSchema = {
    scripts,
    scriptLatest,
    scriptVersions,
    syncOutbox,
};
