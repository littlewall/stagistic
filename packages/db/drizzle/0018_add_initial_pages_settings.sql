CREATE TABLE "script_settings_initial_pages" (
	"script_id" text PRIMARY KEY NOT NULL REFERENCES "scripts"("id") ON DELETE cascade,
	"cast_order_by" text,
	"show_outline" boolean,
	"show_characters_in_songs" boolean,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
