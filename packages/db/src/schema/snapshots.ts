import type {ScriptSummaryMetadata} from '@stagistic/script';
import {sql} from 'drizzle-orm';
import {
    bigint,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
    uniqueIndex,
} from 'drizzle-orm/pg-core';

import {scripts} from './scripts';

/*
 * A fixed, user-created state of a script (UI: Draft or Version). The payload
 * itself is a serialized package snapshot kept in FileStorage, so unlimited
 * snapshots never grow the in-memory database. Only name, note and the
 * draft → version kind change are mutable.
 */
export const scriptSnapshots = pgTable(
    'script_snapshots',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        kind: text('kind').notNull(),
        // Allocated from scripts.last_draft_number for drafts; kept when a draft becomes a version.
        number: integer('number'),
        name: text('name'),
        note: text('note'),
        payloadStorageKey: text('payload_storage_key').notNull(),
        payloadByteLength: integer('payload_byte_length').notNull(),
        documentSchemaVersion: integer('document_schema_version').notNull(),
        summaryMetadata: jsonb('summary_metadata').$type<ScriptSummaryMetadata>(),
        createdBy: text('created_by').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptNumberUniqueIdx: uniqueIndex('script_snapshots_script_number_unique_idx')
            .on(table.scriptId, table.number)
            .where(sql`${table.number} IS NOT NULL`),
        scriptCreatedIdx: index('script_snapshots_script_created_idx').on(table.scriptId, table.createdAt),
    }),
);

/*
 * Attachment blobs referenced by a snapshot payload. Blob deletion must skip
 * any storage key listed here or in script_attachments.
 */
export const scriptSnapshotAttachmentRefs = pgTable(
    'script_snapshot_attachment_refs',
    {
        snapshotId: text('snapshot_id')
            .notNull()
            .references(() => scriptSnapshots.id, {onDelete: 'cascade'}),
        storageKey: text('storage_key').notNull(),
    },
    table => ({
        pk: primaryKey({columns: [table.snapshotId, table.storageKey]}),
        storageKeyIdx: index('script_snapshot_attachment_refs_storage_key_idx').on(table.storageKey),
    }),
);
