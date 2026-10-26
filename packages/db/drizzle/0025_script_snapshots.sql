ALTER TABLE "scripts" ADD COLUMN "last_draft_number" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE "script_snapshots" (
    "id" text PRIMARY KEY NOT NULL,
    "script_id" text NOT NULL,
    "kind" text NOT NULL,
    "number" integer,
    "name" text,
    "note" text,
    "payload_storage_key" text NOT NULL,
    "payload_byte_length" integer NOT NULL,
    "document_schema_version" integer NOT NULL,
    "summary_metadata" jsonb,
    "created_by" text NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_snapshot_attachment_refs" (
    "snapshot_id" text NOT NULL,
    "storage_key" text NOT NULL,
    CONSTRAINT "script_snapshot_attachment_refs_snapshot_id_storage_key_pk" PRIMARY KEY("snapshot_id","storage_key")
);
--> statement-breakpoint
ALTER TABLE "script_snapshots" ADD CONSTRAINT "script_snapshots_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_snapshot_attachment_refs" ADD CONSTRAINT "script_snapshot_attachment_refs_snapshot_id_script_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."script_snapshots"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "script_snapshots_script_number_unique_idx" ON "script_snapshots" USING btree ("script_id","number") WHERE "script_snapshots"."number" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "script_snapshots_script_created_idx" ON "script_snapshots" USING btree ("script_id","created_at");
--> statement-breakpoint
CREATE INDEX "script_snapshot_attachment_refs_storage_key_idx" ON "script_snapshot_attachment_refs" USING btree ("storage_key");
