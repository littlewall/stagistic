UPDATE "scripts"
SET "title" = btrim(legacy_title."field_value")
FROM "script_settings_title_page" AS legacy_title
WHERE legacy_title."script_id" = "scripts"."id"
	AND legacy_title."field_key" = 'titleOverride'
	AND btrim(legacy_title."field_value") <> '';--> statement-breakpoint
DELETE FROM "script_settings_title_page"
WHERE "field_key" = 'titleOverride';
