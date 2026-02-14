CREATE TABLE IF NOT EXISTS "script_characters" (
    "id" text PRIMARY KEY,
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "character_key" text NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "script_characters_script_character_unique_idx"
    ON "script_characters" ("script_id", "character_key");

CREATE INDEX IF NOT EXISTS "script_characters_script_id_idx"
    ON "script_characters" ("script_id");
