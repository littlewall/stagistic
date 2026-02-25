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
        orderNo: integer('order_no').notNull(),
        textContent: text('text_content').notNull().default(''),
        contentJson: text('content_json'),
        sceneId: text('scene_id').references(() => scriptScenes.id, {onDelete: 'set null'}),
        actId: text('act_id').references(() => scriptActs.id, {onDelete: 'set null'}),
        columnGroupId: text('column_group_id'),
        columnIndex: integer('column_index'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptOrderUniqueIdx: uniqueIndex('script_blocks_script_order_unique_idx')
            .on(table.scriptId, table.orderNo),
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

export const scriptLayers = pgTable(
    'script_layers',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        name: text('name').notNull(),
        layerType: text('layer_type').notNull(),
        department: text('department').notNull(),
        colorHex: text('color_hex'),
        isVisible: boolean('is_visible').notNull().default(true),
        orderNo: integer('order_no').notNull(),
        createdBy: text('created_by'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptNameUniqueIdx: uniqueIndex('script_layers_script_name_unique_idx').on(table.scriptId, table.name),
        scriptDepartmentIdx: index('script_layers_script_department_idx').on(table.scriptId, table.department),
        scriptOrderIdx: index('script_layers_script_order_idx').on(table.scriptId, table.orderNo),
    }),
);

export const scriptViews = pgTable(
    'script_views',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        name: text('name').notNull(),
        roleTemplate: text('role_template'),
        configJson: text('config_json').notNull(),
        createdBy: text('created_by'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptNameUniqueIdx: uniqueIndex('script_views_script_name_unique_idx').on(table.scriptId, table.name),
        scriptRoleTemplateIdx: index('script_views_script_role_template_idx').on(table.scriptId, table.roleTemplate),
    }),
);

export const scriptBlockAnnotations = pgTable(
    'script_block_annotations',
    {
        id: text('id').primaryKey(),
        blockId: text('block_id')
            .notNull()
            .references(() => scriptBlocks.id, {onDelete: 'cascade'}),
        layerId: text('layer_id')
            .notNull()
            .references(() => scriptLayers.id, {onDelete: 'cascade'}),
        annotationType: text('annotation_type').notNull(),
        startOffset: integer('start_offset'),
        endOffset: integer('end_offset'),
        anchorText: text('anchor_text'),
        payloadJson: text('payload_json').notNull(),
        status: text('status').notNull().default('active'),
        createdBy: text('created_by'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        blockTypeIdx: index('script_block_annotations_block_type_idx').on(table.blockId, table.annotationType),
        layerIdx: index('script_block_annotations_layer_idx').on(table.layerId),
        blockLayerIdx: index('script_block_annotations_block_layer_idx').on(table.blockId, table.layerId),
        statusIdx: index('script_block_annotations_status_idx').on(table.status),
    }),
);

export const scriptSceneVersions = pgTable(
    'script_scene_versions',
    {
        id: text('id').primaryKey(),
        sceneId: text('scene_id')
            .notNull()
            .references(() => scriptScenes.id, {onDelete: 'cascade'}),
        message: text('message'),
        blocksJson: text('blocks_json').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    },
    table => ({
        sceneCreatedAtIdx: index('script_scene_versions_scene_created_at_idx').on(table.sceneId, table.createdAt),
    }),
);

export const scriptProps = pgTable(
    'script_props',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        name: text('name').notNull(),
        description: text('description'),
        category: text('category'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptNameUniqueIdx: uniqueIndex('script_props_script_name_unique_idx').on(table.scriptId, table.name),
    }),
);

export const scriptSceneProps = pgTable(
    'script_scene_props',
    {
        sceneId: text('scene_id')
            .notNull()
            .references(() => scriptScenes.id, {onDelete: 'cascade'}),
        propId: text('prop_id')
            .notNull()
            .references(() => scriptProps.id, {onDelete: 'cascade'}),
        notes: text('notes'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scenePropPk: primaryKey({
            columns: [table.sceneId, table.propId],
            name: 'script_scene_props_scene_prop_pk',
        }),
        propIdIdx: index('script_scene_props_prop_id_idx').on(table.propId),
    }),
);

export const scriptCostumes = pgTable(
    'script_costumes',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        characterId: text('character_id')
            .notNull()
            .references(() => scriptCharacters.id, {onDelete: 'cascade'}),
        name: text('name').notNull(),
        description: text('description'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptCharacterNameUniqueIdx: uniqueIndex('script_costumes_script_character_name_unique_idx')
            .on(table.scriptId, table.characterId, table.name),
        scriptCharacterIdx: index('script_costumes_script_character_idx').on(table.scriptId, table.characterId),
    }),
);

export const scriptSceneCostumes = pgTable(
    'script_scene_costumes',
    {
        sceneId: text('scene_id')
            .notNull()
            .references(() => scriptScenes.id, {onDelete: 'cascade'}),
        costumeId: text('costume_id')
            .notNull()
            .references(() => scriptCostumes.id, {onDelete: 'cascade'}),
        quickChange: boolean('quick_change').notNull().default(false),
        notes: text('notes'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        sceneCostumePk: primaryKey({
            columns: [table.sceneId, table.costumeId],
            name: 'script_scene_costumes_scene_costume_pk',
        }),
        costumeIdIdx: index('script_scene_costumes_costume_id_idx').on(table.costumeId),
    }),
);

export const scriptCueSheets = pgTable(
    'script_cue_sheets',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        layerId: text('layer_id')
            .notNull()
            .references(() => scriptLayers.id, {onDelete: 'cascade'}),
        name: text('name').notNull(),
        cueOrderJson: text('cue_order_json').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptNameUniqueIdx: uniqueIndex('script_cue_sheets_script_name_unique_idx').on(table.scriptId, table.name),
        layerIdIdx: index('script_cue_sheets_layer_id_idx').on(table.layerId),
    }),
);

export const scriptCueSheetAnnotations = pgTable(
    'script_cue_sheet_annotations',
    {
        cueSheetId: text('cue_sheet_id')
            .notNull()
            .references(() => scriptCueSheets.id, {onDelete: 'cascade'}),
        annotationId: text('annotation_id')
            .notNull()
            .references(() => scriptBlockAnnotations.id, {onDelete: 'cascade'}),
        orderNo: integer('order_no').notNull(),
        notes: text('notes'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        cueSheetAnnotationPk: primaryKey({
            columns: [table.cueSheetId, table.annotationId],
            name: 'script_cue_sheet_annotations_cue_sheet_annotation_pk',
        }),
        cueSheetOrderUniqueIdx: uniqueIndex('script_cue_sheet_annotations_order_unique_idx')
            .on(table.cueSheetId, table.orderNo),
        annotationIdx: index('script_cue_sheet_annotations_annotation_idx').on(table.annotationId),
    }),
);

export const scriptMembers = pgTable(
    'script_members',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        userId: text('user_id').notNull(),
        role: text('role').notNull(),
        department: text('department'),
        characterId: text('character_id').references(() => scriptCharacters.id, {onDelete: 'set null'}),
        viewId: text('view_id').references(() => scriptViews.id, {onDelete: 'set null'}),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptUserUniqueIdx: uniqueIndex('script_members_script_user_unique_idx').on(table.scriptId, table.userId),
        scriptRoleIdx: index('script_members_script_role_idx').on(table.scriptId, table.role),
        scriptDepartmentIdx: index('script_members_script_department_idx').on(table.scriptId, table.department),
    }),
);

export const scriptPermissions = pgTable(
    'script_permissions',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        role: text('role').notNull(),
        resourceType: text('resource_type').notNull(),
        action: text('action').notNull(),
        conditionJson: text('condition_json'),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptRoleIdx: index('script_permissions_script_role_idx').on(table.scriptId, table.role),
        resourceActionIdx: index('script_permissions_resource_action_idx')
            .on(table.scriptId, table.resourceType, table.action),
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
    scriptActs,
    scriptBlocks,
    scriptBlockCharacterRefs,
    scriptLayers,
    scriptBlockAnnotations,
    scriptViews,
    scriptSceneVersions,
    scriptProps,
    scriptSceneProps,
    scriptCostumes,
    scriptSceneCostumes,
    scriptCueSheets,
    scriptCueSheetAnnotations,
    scriptMembers,
    scriptPermissions,
};
