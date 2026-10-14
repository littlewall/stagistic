-- Content hash of an attachment (hex SHA-256): verified after a cloud download.
ALTER TABLE "script_attachments" ADD COLUMN IF NOT EXISTS "sha256" text;
--> statement-breakpoint
-- Attachments whose blob is in the account's cloud storage (local bookkeeping
-- of the sync engine; missing row = upload pending).
CREATE TABLE IF NOT EXISTS "sync_attachments" (
	"attachment_id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"uploaded_at" bigint NOT NULL
);
