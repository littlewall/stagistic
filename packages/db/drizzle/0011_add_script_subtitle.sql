ALTER TABLE "scripts" ADD COLUMN "subtitle" text;--> statement-breakpoint
UPDATE "scripts"
SET "subtitle" = btrim(legacy_subtitle."field_value")
FROM "script_settings_title_page" AS legacy_subtitle
WHERE legacy_subtitle."script_id" = "scripts"."id"
	AND legacy_subtitle."field_key" = 'subtitle'
	AND btrim(legacy_subtitle."field_value") <> '';--> statement-breakpoint
DELETE FROM "script_settings_title_page"
WHERE "field_key" = 'subtitle';
