import {
    bigint, boolean, index, pgTable, primaryKey, text,
} from 'drizzle-orm/pg-core';

import {scriptCharacters} from './characters';
import {scripts} from './scripts';
import {scriptActs, scriptScenes} from './structure';

export const scriptBlocks = pgTable(
    'script_blocks',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        blockType: text('block_type').notNull(),
        blockOrder: text('block_order').notNull(),
        textContent: text('text_content').notNull().default(''),
        /*
         * null for plain-text blocks; populated only when inline content has marks,
         * non-text nodes, or attrs — i.e., when textContent alone can't round-trip.
         */
        contentJson: text('content_json'),
        sceneId: text('scene_id').references(() => scriptScenes.id, {onDelete: 'set null'}),
        actId: text('act_id').references(() => scriptActs.id, {onDelete: 'set null'}),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptOrderIdx: index('script_blocks_script_order_idx').on(table.scriptId, table.blockOrder),
        scriptTypeIdx: index('script_blocks_script_type_idx').on(table.scriptId, table.blockType),
        scriptSceneIdx: index('script_blocks_script_scene_idx').on(table.scriptId, table.sceneId),
        scriptActIdx: index('script_blocks_script_act_idx').on(table.scriptId, table.actId),
    }),
);

/*
 * Projection-owned references derived from the current document plus confirmed
 * character metadata. Safe to delete and rebuild from the document source.
 */
export const scriptBlockCharacterRefs = pgTable(
    'script_block_character_refs',
    {
        blockId: text('block_id')
            .notNull()
            .references(() => scriptBlocks.id, {onDelete: 'cascade'}),
        characterId: text('character_id')
            .notNull()
            .references(() => scriptCharacters.id, {onDelete: 'cascade'}),
        characterKey: text('character_key').notNull(),
        isConfirmed: boolean('is_confirmed').notNull().default(false),
    },
    table => ({
        blockCharacterKeyPk: primaryKey({
            columns: [table.blockId, table.characterKey],
            name: 'script_block_character_refs_block_character_key_pk',
        }),
        characterIdIdx: index('script_block_character_refs_character_id_idx').on(table.characterId),
    }),
);

/*
 * Script music catalog. Music markers in the document assign existing music rows to
 * block intervals by setting start/end block ids; removing a marker only clears
 * that assignment.
 */
