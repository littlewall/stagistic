CREATE TABLE "script_cues" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"cue_number" integer NOT NULL,
	"mode" text DEFAULT 'open' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"kind" text,
	"start_block_id" text NOT NULL,
	"end_block_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "script_cues" ADD CONSTRAINT "script_cues_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "script_cues_script_id_idx" ON "script_cues" USING btree ("script_id");
