CREATE TABLE "script_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_cue_attachments" (
	"cue_id" text NOT NULL,
	"attachment_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "script_cue_attachments_cue_attachment_pk" PRIMARY KEY("cue_id","attachment_id")
);
--> statement-breakpoint
ALTER TABLE "script_attachments" ADD CONSTRAINT "script_attachments_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" ADD CONSTRAINT "script_cue_attachments_cue_id_script_cues_id_fk" FOREIGN KEY ("cue_id") REFERENCES "public"."script_cues"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" ADD CONSTRAINT "script_cue_attachments_attachment_id_script_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."script_attachments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "script_attachments_script_id_idx" ON "script_attachments" USING btree ("script_id");
--> statement-breakpoint
CREATE INDEX "script_cue_attachments_cue_id_idx" ON "script_cue_attachments" USING btree ("cue_id");
--> statement-breakpoint
CREATE INDEX "script_cue_attachments_attachment_id_idx" ON "script_cue_attachments" USING btree ("attachment_id");
