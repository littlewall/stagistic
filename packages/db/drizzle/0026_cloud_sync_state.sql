-- Local cloud-sync state, written only by the sync engine.
-- The account this device syncs with; `checked` = the post-sign-in check ran.
CREATE TABLE IF NOT EXISTS "sync_account" (
	"id" integer PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"email" text NOT NULL,
	"checked" boolean NOT NULL DEFAULT false,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
-- Per script: account it was last synced with and the state vectors of its
-- three Y.Docs at that moment (base64). No FK: survives the script's deletion
-- long enough to become a tombstone.
CREATE TABLE IF NOT EXISTS "sync_state" (
	"script_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"body_state_vector" text,
	"meta_state_vector" text,
	"comments_state_vector" text,
	"synced_at" bigint NOT NULL
);
--> statement-breakpoint
-- Scripts deleted on this device that still exist in the account's cloud.
CREATE TABLE IF NOT EXISTS "sync_tombstones" (
	"script_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"deleted_at" bigint NOT NULL
);
