import {
    bigint, index, integer, pgTable, primaryKey, text, uniqueIndex,
} from 'drizzle-orm/pg-core';

import {scripts} from './scripts';

export const scriptMusic = pgTable(
    'script_music',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        sceneNumber: integer('scene_number').notNull().default(0),
        indexInScene: integer('index_in_scene').notNull().default(0),
        mode: text('mode').notNull().default('open'),
        title: text('title').notNull().default(''),
        kind: text('kind'),
        startBlockId: text('start_block_id'),
        endBlockId: text('end_block_id'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_music_script_id_idx').on(table.scriptId),
    }),
);

/*
 * Attachment file records (metadata only). Binaries live outside Postgres in a
 * FileStorage (IndexedDB in the browser); storage_key is the FileStorage key.
 */
export const scriptAttachments = pgTable(
    'script_attachments',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        filename: text('filename').notNull(),
        mimeType: text('mime_type').notNull(),
        sizeBytes: bigint('size_bytes', {mode: 'number'}).notNull(),
        storageKey: text('storage_key').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_attachments_script_id_idx').on(table.scriptId),
    }),
);

export const scriptMusicAttachments = pgTable(
    'script_music_attachments',
    {
        musicId: text('music_id')
            .notNull()
            .references(() => scriptMusic.id, {onDelete: 'cascade'}),
        attachmentId: text('attachment_id')
            .notNull()
            .references(() => scriptAttachments.id, {onDelete: 'cascade'}),
        role: text('role').notNull().default('integrated_score'),
        sortOrder: bigint('sort_order', {mode: 'number'}).notNull().default(0),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    },
    table => ({
        pk: primaryKey({columns: [table.musicId, table.attachmentId]}),
        musicRoleUniqueIdx: uniqueIndex('script_music_attachments_music_role_unique_idx').on(table.musicId, table.role),
        musicIdIdx: index('script_music_attachments_music_id_idx').on(table.musicId),
        attachmentIdIdx: index('script_music_attachments_attachment_id_idx').on(table.attachmentId),
    }),
);

/*
 * Private comment threads. Range anchors live in the document as
 * `commentAnchor` marks; block anchors are `anchor_block_id`. Not projection-owned:
 * never rebuilt from the document.
 */
