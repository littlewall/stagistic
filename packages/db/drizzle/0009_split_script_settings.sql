CREATE TABLE "script_settings_page_layout" (
	"script_id" text PRIMARY KEY NOT NULL REFERENCES "scripts"("id") ON DELETE cascade,
	"width_px" real, "height_px" real, "margin_top_px" real, "margin_right_px" real,
	"margin_bottom_px" real, "margin_left_px" real, "page_gap_px" real,
	"page_break_background" text, "content_margin_top_px" real, "content_margin_bottom_px" real,
	"font_size_px" real, "line_height" real, "created_at" bigint NOT NULL, "updated_at" bigint NOT NULL
);--> statement-breakpoint
CREATE TABLE "script_settings_visual_preferences" (
	"script_id" text PRIMARY KEY NOT NULL REFERENCES "scripts"("id") ON DELETE cascade,
	"character_color_saturation" real, "created_at" bigint NOT NULL, "updated_at" bigint NOT NULL
);--> statement-breakpoint
CREATE TABLE "script_settings_structure" (
	"script_id" text PRIMARY KEY NOT NULL REFERENCES "scripts"("id") ON DELETE cascade,
	"act_lines_before" integer, "act_lines_after" integer,
	"created_at" bigint NOT NULL, "updated_at" bigint NOT NULL
);--> statement-breakpoint
CREATE TABLE "script_settings_headers_footers" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE cascade,
	"area" text NOT NULL, "alignment" text NOT NULL, "text_content" text DEFAULT '' NOT NULL,
	"is_bold" boolean DEFAULT false NOT NULL, "is_italic" boolean DEFAULT false NOT NULL,
	"is_underline" boolean DEFAULT false NOT NULL, "is_hidden_in_editor" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL, "updated_at" bigint NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "script_settings_headers_footers_cell_unique_idx"
	ON "script_settings_headers_footers" ("script_id", "area", "alignment");--> statement-breakpoint
CREATE INDEX "script_settings_headers_footers_script_id_idx"
	ON "script_settings_headers_footers" ("script_id");--> statement-breakpoint
CREATE TABLE "script_settings_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE cascade,
	"block_type" text NOT NULL, "spacing_before_millis" integer, "line_height_millis" integer,
	"indent_left_chars" integer, "indent_right_chars" integer, "shortcut" text,
	"next_element" text, "text_align" text, "casing" text, "is_bold" boolean,
	"is_italic" boolean, "is_underline" boolean, "created_at" bigint NOT NULL, "updated_at" bigint NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "script_settings_blocks_script_block_type_unique_idx"
	ON "script_settings_blocks" ("script_id", "block_type");--> statement-breakpoint
CREATE INDEX "script_settings_blocks_script_id_idx" ON "script_settings_blocks" ("script_id");--> statement-breakpoint
INSERT INTO "script_settings_blocks"
SELECT b."id", c."script_id", b."block_type", b."spacing_before_millis", b."line_height_millis",
	b."indent_left_chars", b."indent_right_chars", b."shortcut", b."next_element", b."text_align",
	b."casing", b."is_bold", b."is_italic", b."is_underline", b."created_at", b."updated_at"
FROM "script_config_blocks" b JOIN "script_configs" c ON c."id" = b."config_id"
WHERE c."namespace" = 'editor';--> statement-breakpoint
INSERT INTO "script_settings_page_layout"
SELECT c."script_id", (c."payload_json"::jsonb #>> '{page,widthPx}')::real,
	(c."payload_json"::jsonb #>> '{page,heightPx}')::real,
	(c."payload_json"::jsonb #>> '{page,marginTopPx}')::real,
	(c."payload_json"::jsonb #>> '{page,marginRightPx}')::real,
	(c."payload_json"::jsonb #>> '{page,marginBottomPx}')::real,
	(c."payload_json"::jsonb #>> '{page,marginLeftPx}')::real,
	(c."payload_json"::jsonb #>> '{page,pageGapPx}')::real,
	c."payload_json"::jsonb #>> '{page,pageBreakBackground}',
	(c."payload_json"::jsonb #>> '{page,contentMarginTopPx}')::real,
	(c."payload_json"::jsonb #>> '{page,contentMarginBottomPx}')::real,
	(c."payload_json"::jsonb #>> '{typography,fontSizePx}')::real,
	(c."payload_json"::jsonb #>> '{typography,lineHeight}')::real, c."created_at", c."updated_at"
FROM "script_configs" c WHERE c."namespace" = 'editor'
	AND (c."payload_json"::jsonb ? 'page' OR c."payload_json"::jsonb ? 'typography');--> statement-breakpoint
INSERT INTO "script_settings_visual_preferences"
SELECT c."script_id", (c."payload_json"::jsonb #>> '{visual,characterColorSaturation}')::real,
	c."created_at", c."updated_at" FROM "script_configs" c
WHERE c."namespace" = 'editor' AND c."payload_json"::jsonb ? 'visual';--> statement-breakpoint
INSERT INTO "script_settings_structure"
SELECT c."script_id", (c."payload_json"::jsonb #>> '{structure,actDisplay,linesBefore}')::integer,
	(c."payload_json"::jsonb #>> '{structure,actDisplay,linesAfter}')::integer,
	c."created_at", c."updated_at" FROM "script_configs" c
WHERE c."namespace" = 'editor' AND c."payload_json"::jsonb ? 'structure';--> statement-breakpoint
ALTER TABLE "script_title_page_fields" RENAME TO "script_settings_title_page";--> statement-breakpoint
ALTER TABLE "script_settings_title_page" ADD COLUMN "group_no" integer;--> statement-breakpoint
INSERT INTO "script_settings_title_page"
SELECT 'migrated-title:' || c."script_id" || ':' || fields."key", c."script_id",
	fields."key", fields."value", 100000 + row_number() OVER (PARTITION BY c."script_id" ORDER BY fields."key"),
	c."created_at", c."updated_at", NULL
FROM "script_configs" c
CROSS JOIN LATERAL jsonb_each_text(c."payload_json"::jsonb) fields
WHERE c."namespace" = 'title-page' AND fields."key" <> 'credits';--> statement-breakpoint
INSERT INTO "script_settings_title_page"
SELECT 'migrated-credit-label:' || c."script_id" || ':' || credits.ordinality,
	c."script_id", 'credit_label', credits.credit ->> 'credit',
	200000 + credits.ordinality::integer * 1000, c."created_at", c."updated_at",
	credits.ordinality::integer - 1
FROM "script_configs" c
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c."payload_json"::jsonb -> 'credits', '[]'::jsonb))
	WITH ORDINALITY AS credits(credit, ordinality)
WHERE c."namespace" = 'title-page';--> statement-breakpoint
INSERT INTO "script_settings_title_page"
SELECT 'migrated-credit-author:' || c."script_id" || ':' || credits.ordinality || ':' || authors.ordinality,
	c."script_id", 'credit_author', authors.author,
	200000 + credits.ordinality::integer * 1000 + authors.ordinality::integer,
	c."created_at", c."updated_at", credits.ordinality::integer - 1
FROM "script_configs" c
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c."payload_json"::jsonb -> 'credits', '[]'::jsonb))
	WITH ORDINALITY AS credits(credit, ordinality)
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(credits.credit -> 'authors', '[]'::jsonb))
	WITH ORDINALITY AS authors(author, ordinality)
WHERE c."namespace" = 'title-page';--> statement-breakpoint
ALTER INDEX "script_title_page_fields_script_order_unique_idx"
	RENAME TO "script_settings_title_page_script_order_unique_idx";--> statement-breakpoint
ALTER INDEX "script_title_page_fields_script_id_idx"
	RENAME TO "script_settings_title_page_script_id_idx";--> statement-breakpoint
DROP TABLE "script_config_blocks";--> statement-breakpoint
DROP TABLE "script_configs";
