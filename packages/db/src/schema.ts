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

export const scriptLatest = pgTable('script_latest', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    contentJson: text('content_json').notNull(),
    contentHash: text('content_hash').notNull().default(''),
    contentSize: integer('content_size').notNull().default(0),
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

export const scriptBlockIndexMeta = pgTable('script_block_index_meta', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    contentHash: text('content_hash').notNull().default(''),
    indexSchemaVersion: integer('index_schema_version').notNull().default(1),
    status: text('status').notNull().default('stale'),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    lastError: text('last_error'),
});

export const scriptBlockIndexRows = pgTable(
    'script_block_index_rows',
    {
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        blockId: text('block_id').notNull(),
        orderNo: integer('order_no').notNull(),
        blockType: text('block_type').notNull(),
        textContent: text('text_content').notNull(),
        actBlockId: text('act_block_id'),
        sceneBlockId: text('scene_block_id'),
        columnGroupOrder: integer('column_group_order'),
        columnOrder: integer('column_order'),
        characterRefsJson: text('character_refs_json'),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptBlockPk: primaryKey({
            columns: [table.scriptId, table.blockId],
            name: 'script_block_index_rows_script_block_pk',
        }),
        scriptOrderIdx: index('script_block_index_rows_script_order_idx')
            .on(table.scriptId, table.orderNo),
        scriptTypeIdx: index('script_block_index_rows_script_type_idx')
            .on(table.scriptId, table.blockType),
        scriptActIdx: index('script_block_index_rows_script_act_idx')
            .on(table.scriptId, table.actBlockId),
        scriptSceneIdx: index('script_block_index_rows_script_scene_idx')
            .on(table.scriptId, table.sceneBlockId),
        scriptTextIdx: index('script_block_index_rows_script_text_idx')
            .on(table.scriptId, table.textContent),
    }),
);

export const dbSchema = {
    scripts,
    scriptLatest,
    scriptVersions,
    syncOutbox,
    scriptConfigs,
    scriptConfigBlocks,
    scriptCharacters,
    scriptCharacterGenders,
    scriptBlockIndexMeta,
    scriptBlockIndexRows,
};
