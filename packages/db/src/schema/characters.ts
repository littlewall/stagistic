import {bigint, index, pgTable, primaryKey, text, uniqueIndex} from 'drizzle-orm/pg-core';

import {scripts} from './scripts';

export const scriptCharacters = pgTable(
    'script_characters',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        characterKey: text('character_key').notNull(),
        kind: text('kind').notNull().default('character'),
        colorHex: text('color_hex'),
        genderKey: text('gender_key'),
        notes: text('notes'),
        backstory: text('backstory'),
        outline: text('outline'),
        voiceType: text('voice_type'),
        vocalRangeLow: text('vocal_range_low'),
        vocalRangeHigh: text('vocal_range_high'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptCharacterUniqueIdx: uniqueIndex('script_characters_script_character_unique_idx').on(table.scriptId, table.characterKey),
        scriptIdIdx: index('script_characters_script_id_idx').on(table.scriptId),
    }),
);

export const scriptCharacterGroupMembers = pgTable(
    'script_character_group_members',
    {
        groupId: text('group_id')
            .notNull()
            .references(() => scriptCharacters.id, {onDelete: 'cascade'}),
        characterId: text('character_id')
            .notNull()
            .references(() => scriptCharacters.id, {onDelete: 'cascade'}),
    },
    table => ({
        pk: primaryKey({columns: [table.groupId, table.characterId]}),
        characterIdIdx: index('script_character_group_members_character_id_idx').on(table.characterId),
    }),
);

export const scriptCharacterGenders = pgTable(
    'script_character_genders',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        genderKey: text('gender_key').notNull(),
        genderLabel: text('gender_label').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptGenderUniqueIdx: uniqueIndex('script_character_genders_script_gender_unique_idx').on(table.scriptId, table.genderKey),
        scriptIdIdx: index('script_character_genders_script_id_idx').on(table.scriptId),
    }),
);
