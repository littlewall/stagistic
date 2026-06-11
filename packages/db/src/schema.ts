import {
    bigint,
    boolean,
    index,
    integer,
    pgTable,
    primaryKey,
    text,
    uniqueIndex,
} from 'drizzle-orm/pg-core';

export const scripts = pgTable('scripts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    activeBlockId: text('active_block_id'),
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

export const scriptConfigs = pgTable(
    'script_configs',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        namespace: text('namespace').notNull(),
        payloadJson: text('payload_json'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
        schemaVersion: integer('schema_version').notNull().default(1),
    },
    table => ({
        scriptNamespaceUniqueIdx: uniqueIndex('script_configs_script_namespace_unique_idx')
            .on(table.scriptId, table.namespace),
        scriptIdIdx: index('script_configs_script_id_idx').on(table.scriptId),
    }),
);

export const scriptConfigBlocks = pgTable(
    'script_config_blocks',
    {
        id: text('id').primaryKey(),
        configId: text('config_id')
            .notNull()
            .references(() => scriptConfigs.id, {onDelete: 'cascade'}),
        blockType: text('block_type').notNull(),
        spacingBeforeMillis: integer('spacing_before_millis'),
        lineHeightMillis: integer('line_height_millis'),
        indentLeftChars: integer('indent_left_chars'),
        indentRightChars: integer('indent_right_chars'),
        shortcut: text('shortcut'),
        nextElement: text('next_element'),
        textAlign: text('text_align'),
        casing: text('casing'),
        isBold: boolean('is_bold'),
        isItalic: boolean('is_italic'),
        isUnderline: boolean('is_underline'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        configBlockTypeUniqueIdx: uniqueIndex('script_config_blocks_config_block_type_unique_idx')
            .on(table.configId, table.blockType),
        configIdIdx: index('script_config_blocks_config_id_idx').on(table.configId),
    }),
);

export const scriptCharacters = pgTable(
    'script_characters',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        characterKey: text('character_key').notNull(),
        colorHex: text('color_hex'),
        genderKey: text('gender_key'),
        notes: text('notes'),
        backstory: text('backstory'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptCharacterUniqueIdx: uniqueIndex('script_characters_script_character_unique_idx')
            .on(table.scriptId, table.characterKey),
        scriptIdIdx: index('script_characters_script_id_idx').on(table.scriptId),
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
        scriptGenderUniqueIdx: uniqueIndex('script_character_genders_script_gender_unique_idx')
            .on(table.scriptId, table.genderKey),
        scriptIdIdx: index('script_character_genders_script_id_idx').on(table.scriptId),
    }),
);

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
        scriptNameUniqueIdx: uniqueIndex('script_locations_script_name_unique_idx')
            .on(table.scriptId, table.name),
        scriptIdIdx: index('script_locations_script_id_idx').on(table.scriptId),
    }),
);

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

export const scriptTitlePageFields = pgTable(
    'script_title_page_fields',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        fieldKey: text('field_key').notNull(),
        fieldValue: text('field_value').notNull(),
        orderNo: integer('order_no').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptOrderUniqueIdx: uniqueIndex('script_title_page_fields_script_order_unique_idx')
            .on(table.scriptId, table.orderNo),
        scriptIdIdx: index('script_title_page_fields_script_id_idx').on(table.scriptId),
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
        columnGroupId: text('column_group_id'),
        columnIndex: integer('column_index'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptOrderIdx: index('script_blocks_script_order_idx')
            .on(table.scriptId, table.blockOrder),
        scriptTypeIdx: index('script_blocks_script_type_idx').on(table.scriptId, table.blockType),
        scriptSceneIdx: index('script_blocks_script_scene_idx').on(table.scriptId, table.sceneId),
        scriptActIdx: index('script_blocks_script_act_idx').on(table.scriptId, table.actId),
    }),
);

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

export const dbSchema = {
    scripts,
    syncOutbox,
    scriptConfigs,
    scriptConfigBlocks,
    scriptCharacters,
    scriptCharacterGenders,
    scriptLocations,
    scriptScenes,
    scriptTitlePageFields,
    scriptActs,
    scriptBlocks,
    scriptBlockCharacterRefs,
};
