CREATE TABLE IF NOT EXISTS "script_block_index_meta" (
    "script_id" text PRIMARY KEY REFERENCES "scripts"("id") ON DELETE CASCADE,
    "content_hash" text NOT NULL DEFAULT '',
    "index_schema_version" integer NOT NULL DEFAULT 1,
    "status" text NOT NULL DEFAULT 'stale',
    "updated_at" bigint NOT NULL,
    "last_error" text
);

CREATE TABLE IF NOT EXISTS "script_block_index_rows" (
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "block_id" text NOT NULL,
    "order_no" integer NOT NULL,
    "block_type" text NOT NULL,
    "text_content" text NOT NULL,
    "act_block_id" text,
    "scene_block_id" text,
    "column_group_order" integer,
    "column_order" integer,
    "character_refs_json" text,
    "updated_at" bigint NOT NULL,
    CONSTRAINT "script_block_index_rows_script_block_pk" PRIMARY KEY ("script_id", "block_id")
);

CREATE INDEX IF NOT EXISTS "script_block_index_rows_script_order_idx"
    ON "script_block_index_rows" ("script_id", "order_no");

CREATE INDEX IF NOT EXISTS "script_block_index_rows_script_type_idx"
    ON "script_block_index_rows" ("script_id", "block_type");

CREATE INDEX IF NOT EXISTS "script_block_index_rows_script_act_idx"
    ON "script_block_index_rows" ("script_id", "act_block_id");

CREATE INDEX IF NOT EXISTS "script_block_index_rows_script_scene_idx"
    ON "script_block_index_rows" ("script_id", "scene_block_id");

CREATE INDEX IF NOT EXISTS "script_block_index_rows_script_text_idx"
    ON "script_block_index_rows" ("script_id", "text_content");
