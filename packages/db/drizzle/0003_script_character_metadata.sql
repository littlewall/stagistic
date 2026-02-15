ALTER TABLE "script_characters"
    ADD COLUMN IF NOT EXISTS "color_hex" text;

ALTER TABLE "script_characters"
    ADD COLUMN IF NOT EXISTS "gender_key" text;

CREATE TABLE IF NOT EXISTS "script_character_genders" (
    "id" text PRIMARY KEY,
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "gender_key" text NOT NULL,
    "gender_label" text NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "script_character_genders_script_gender_unique_idx"
    ON "script_character_genders" ("script_id", "gender_key");

CREATE INDEX IF NOT EXISTS "script_character_genders_script_id_idx"
    ON "script_character_genders" ("script_id");
