import {
    bigint, boolean, index, integer, pgTable, real, text, uniqueIndex,
} from 'drizzle-orm/pg-core';

import {scripts} from './scripts';

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
