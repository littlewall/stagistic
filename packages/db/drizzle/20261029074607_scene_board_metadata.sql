CREATE TABLE "script_scene_characters" (
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "heading_block_id" text NOT NULL,
    "character_id" text NOT NULL REFERENCES "script_characters"("id") ON DELETE CASCADE,
    "note" text,
    "arc_value" integer CHECK ("arc_value" BETWEEN -3 AND 3),
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    PRIMARY KEY ("script_id", "heading_block_id", "character_id")
);
--> statement-breakpoint
CREATE INDEX "script_scene_characters_script_id_idx" ON "script_scene_characters" ("script_id");
--> statement-breakpoint
CREATE TABLE "script_detached_scenes" (
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "heading_block_id" text NOT NULL,
    "synopsis" text,
    "color_hex" text,
    "location_id" text REFERENCES "script_locations"("id") ON DELETE SET NULL,
    "location_ids" jsonb NOT NULL,
    "detached_at" bigint NOT NULL,
    PRIMARY KEY ("script_id", "heading_block_id")
);
