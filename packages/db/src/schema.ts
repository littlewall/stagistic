import {bigint, boolean, index, integer, pgTable, primaryKey, real, text, uniqueIndex} from 'drizzle-orm/pg-core';

export const scripts = pgTable('scripts', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
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

export const scriptSettingsPageLayout = pgTable('script_settings_page_layout', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    widthPx: real('width_px'),
    heightPx: real('height_px'),
    marginTopPx: real('margin_top_px'),
    marginRightPx: real('margin_right_px'),
    marginBottomPx: real('margin_bottom_px'),
    marginLeftPx: real('margin_left_px'),
    pageGapPx: real('page_gap_px'),
    pageBreakBackground: text('page_break_background'),
    contentMarginTopPx: real('content_margin_top_px'),
    contentMarginBottomPx: real('content_margin_bottom_px'),
    fontSizePx: real('font_size_px'),
    lineHeight: real('line_height'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
});

export const scriptSettingsVisualPreferences = pgTable('script_settings_visual_preferences', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    characterColorSaturation: real('character_color_saturation'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
});

export const scriptSettingsStructure = pgTable('script_settings_structure', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    actLinesBefore: integer('act_lines_before'),
    actLinesAfter: integer('act_lines_after'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
});

export const scriptSettingsInitialPages = pgTable('script_settings_initial_pages', {
    scriptId: text('script_id')
        .primaryKey()
        .references(() => scripts.id, {onDelete: 'cascade'}),
    castOrderBy: text('cast_order_by'),
    showOutline: boolean('show_outline'),
    showCharactersInSongs: boolean('show_characters_in_songs'),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
    updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
});

export const scriptSettingsHeadersFooters = pgTable(
    'script_settings_headers_footers',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        area: text('area').notNull(),
        alignment: text('alignment').notNull(),
        textContent: text('text_content').notNull().default(''),
        isBold: boolean('is_bold').notNull().default(false),
        isItalic: boolean('is_italic').notNull().default(false),
        isUnderline: boolean('is_underline').notNull().default(false),
        isHiddenInEditor: boolean('is_hidden_in_editor').notNull().default(false),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptAreaAlignmentUniqueIdx: uniqueIndex('script_settings_headers_footers_cell_unique_idx').on(table.scriptId, table.area, table.alignment),
        scriptIdIdx: index('script_settings_headers_footers_script_id_idx').on(table.scriptId),
    }),
);

export const scriptSettingsBlocks = pgTable(
    'script_settings_blocks',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
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
        scriptBlockTypeUniqueIdx: uniqueIndex('script_settings_blocks_script_block_type_unique_idx').on(table.scriptId, table.blockType),
        scriptIdIdx: index('script_settings_blocks_script_id_idx').on(table.scriptId),
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

export const scriptSettingsTitlePage = pgTable(
    'script_settings_title_page',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        fieldKey: text('field_key').notNull(),
        fieldValue: text('field_value').notNull(),
        groupNo: integer('group_no'),
        orderNo: integer('order_no').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptOrderUniqueIdx: uniqueIndex('script_settings_title_page_script_order_unique_idx').on(table.scriptId, table.orderNo),
        scriptIdIdx: index('script_settings_title_page_script_id_idx').on(table.scriptId),
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
export const scriptCommentThreads = pgTable(
    'script_comment_threads',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        anchorKind: text('anchor_kind').notNull(),
        anchorBlockId: text('anchor_block_id'),
        quotedText: text('quoted_text').notNull().default(''),
        status: text('status').notNull().default('open'),
        resolvedAt: bigint('resolved_at', {mode: 'number'}),
        resolvedBy: text('resolved_by'),
        createdBy: text('created_by').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
    },
    table => ({
        scriptIdIdx: index('script_comment_threads_script_id_idx').on(table.scriptId),
    }),
);

/*
 * Flat replies of a comment thread (first row = root message). script_id is
 * denormalized so reactive sources can watch by script without a join.
 */
export const scriptCommentMessages = pgTable(
    'script_comment_messages',
    {
        id: text('id').primaryKey(),
        scriptId: text('script_id')
            .notNull()
            .references(() => scripts.id, {onDelete: 'cascade'}),
        threadId: text('thread_id')
            .notNull()
            .references(() => scriptCommentThreads.id, {onDelete: 'cascade'}),
        authorId: text('author_id').notNull(),
        body: text('body').notNull(),
        createdAt: bigint('created_at', {mode: 'number'}).notNull(),
        updatedAt: bigint('updated_at', {mode: 'number'}).notNull(),
        editedAt: bigint('edited_at', {mode: 'number'}),
    },
    table => ({
        threadCreatedIdx: index('script_comment_messages_thread_created_idx').on(table.threadId, table.createdAt),
        scriptIdIdx: index('script_comment_messages_script_id_idx').on(table.scriptId),
    }),
);

export const dbSchema = {
    scripts,
    syncOutbox,
    scriptSettingsPageLayout,
    scriptSettingsVisualPreferences,
    scriptSettingsStructure,
    scriptSettingsInitialPages,
    scriptSettingsHeadersFooters,
    scriptSettingsBlocks,
    scriptCharacters,
    scriptCharacterGroupMembers,
    scriptCharacterGenders,
    scriptLocations,
    scriptScenes,
    scriptSceneLocations,
    scriptSettingsTitlePage,
    scriptActs,
    scriptBlocks,
    scriptBlockCharacterRefs,
    scriptMusic,
    scriptAttachments,
    scriptMusicAttachments,
    scriptCommentThreads,
    scriptCommentMessages,
};
