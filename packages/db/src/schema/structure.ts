import {
    bigint, index, pgTable, primaryKey, text, uniqueIndex,
} from 'drizzle-orm/pg-core';

import {scripts} from './scripts';

export const scriptLocations = pgTable(
    'script_locations',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        name: text('name').notNull(),
        description: text('description'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptNameUniqueIdx: uniqueIndex('script_locations_script_name_unique_idx').on(table.scriptId, table.name),
        scriptIdIdx: index('script_locations_script_id_idx').on(table.scriptId),
    }),
);

/*
 * User-authored scene metadata shares a row with projection-owned scene
 * identity. Projection writers may refresh headingBlockId / sceneNumber, but
 * must preserve colorHex, synopsis, and locationId for surviving scenes.
 */
export const scriptScenes = pgTable(
    'script_scenes',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        headingBlockId: text('heading_block_id'),
        sceneNumber: text('scene_number'),
        colorHex: text('color_hex'),
        synopsis: text('synopsis'),
        locationId: text('location_id').references(() => scriptLocations.id, {onDelete: 'set null'}),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_scenes_script_id_idx').on(table.scriptId),
        scriptLocationIdx: index('script_scenes_script_location_idx').on(table.scriptId, table.locationId),
    }),
);

export const scriptSceneLocations = pgTable(
    'script_scene_locations',
    {
        sceneId: text('scene_id')
            .notNull()
            .references(() => scriptScenes.id, {onDelete: 'cascade'}),
        locationId: text('location_id')
            .notNull()
            .references(() => scriptLocations.id, {onDelete: 'cascade'}),
    },
    table => ({
        pk: primaryKey({columns: [table.sceneId, table.locationId]}),
        locationIdIdx: index('script_scene_locations_location_id_idx').on(table.locationId),
    }),
);

export const scriptActs = pgTable(
    'script_acts',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        headingBlockId: text('heading_block_id'),
        name: text('name').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_acts_script_id_idx').on(table.scriptId),
    }),
);

/*
 * Projection-owned block rows materialize the current script body for fast
 * queries/export. The authoritative document source may change in the future;
 * this table should remain rebuildable from that source.
 */
