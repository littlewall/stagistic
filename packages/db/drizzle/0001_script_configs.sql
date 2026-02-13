CREATE TABLE IF NOT EXISTS "script_configs" (
    "id" text PRIMARY KEY,
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "namespace" text NOT NULL,
    "payload_json" text,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "schema_version" integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "script_configs_script_namespace_unique_idx"
    ON "script_configs" ("script_id", "namespace");

CREATE INDEX IF NOT EXISTS "script_configs_script_id_idx"
    ON "script_configs" ("script_id");

CREATE TABLE IF NOT EXISTS "script_config_blocks" (
    "id" text PRIMARY KEY,
    "config_id" text NOT NULL REFERENCES "script_configs"("id") ON DELETE CASCADE,
    "block_type" text NOT NULL,
    "spacing_before_millis" integer,
    "line_height_millis" integer,
    "indent_left_chars" integer,
    "indent_right_chars" integer,
    "shortcut" text,
    "next_element" text,
    "text_align" text,
    "casing" text,
    "is_bold" boolean,
    "is_italic" boolean,
    "is_underline" boolean,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "script_config_blocks_config_block_type_unique_idx"
    ON "script_config_blocks" ("config_id", "block_type");

CREATE INDEX IF NOT EXISTS "script_config_blocks_config_id_idx"
    ON "script_config_blocks" ("config_id");
