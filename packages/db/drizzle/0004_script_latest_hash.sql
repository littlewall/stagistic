ALTER TABLE "script_latest"
    ADD COLUMN IF NOT EXISTS "content_hash" text NOT NULL DEFAULT '';

ALTER TABLE "script_latest"
    ADD COLUMN IF NOT EXISTS "content_size" integer NOT NULL DEFAULT 0;
