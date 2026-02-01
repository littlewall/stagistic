CREATE TABLE IF NOT EXISTS "scripts" (
    "id" text PRIMARY KEY,
    "title" text NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "active_block_id" text
);

CREATE TABLE IF NOT EXISTS "script_latest" (
    "script_id" text PRIMARY KEY REFERENCES "scripts"("id") ON DELETE CASCADE,
    "content_json" text NOT NULL,
    "updated_at" bigint NOT NULL,
    "schema_version" integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "script_versions" (
    "id" text PRIMARY KEY,
    "script_id" text NOT NULL REFERENCES "scripts"("id") ON DELETE CASCADE,
    "message" text,
    "content_json" text NOT NULL,
    "created_at" bigint NOT NULL,
    "schema_version" integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "script_versions_script_id_created_at_idx"
    ON "script_versions" ("script_id", "created_at");

CREATE TABLE IF NOT EXISTS "sync_outbox" (
    "id" text PRIMARY KEY,
    "script_id" text,
    "op_type" text,
    "payload_json" text,
    "created_at" bigint,
    "status" text NOT NULL DEFAULT 'pending'
);
