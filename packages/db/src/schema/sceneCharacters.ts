import {sql} from 'drizzle-orm';
import {
    bigint,
    check,
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    text,
} from 'drizzle-orm/pg-core';

import {scriptCharacters} from './characters';
import {scripts} from './scripts';
import {scriptLocations} from './structure';

export const scriptSceneCharacters = pgTable('script_scene_characters', {
    scriptId: text('script_id').notNull().references(() => scripts.id, {onDelete: 'cascade'}),
    headingBlockId: text('heading_block_id').notNull(),
    characterId: text('character_id').notNull().references(() => scriptCharacters.id, {onDelete: 'cascade'}),
    note: text('note'),
    arcValue: integer('arc_value'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
}, table => ({
    pk: primaryKey({columns: [
        table.scriptId,
        table.headingBlockId,
        table.characterId,
    ]}),
    scriptIdIdx: index('script_scene_characters_script_id_idx').on(table.scriptId),
    arcRange: check('script_scene_characters_arc_range', sql`${table.arcValue} BETWEEN -3 AND 3`),
}));

/** Metadata held aside until the heading returns or a new state is saved. */
export const scriptDetachedScenes = pgTable('script_detached_scenes', {
    scriptId: text('script_id').notNull().references(() => scripts.id, {onDelete: 'cascade'}),
    headingBlockId: text('heading_block_id').notNull(),
    synopsis: text('synopsis'),
    colorHex: text('color_hex'),
    locationId: text('location_id').references(() => scriptLocations.id, {onDelete: 'set null'}),
    locationIds: jsonb('location_ids').$type<string[]>().notNull(),
    detachedAt: bigint('detached_at', {mode: 'number'}).notNull(),
}, table => ({pk: primaryKey({columns: [table.scriptId, table.headingBlockId]})}));
