CREATE TABLE "script_comment_threads" (
    "id" text PRIMARY KEY NOT NULL,
    "script_id" text NOT NULL,
    "anchor_kind" text NOT NULL,
    "anchor_block_id" text,
    "quoted_text" text DEFAULT '' NOT NULL,
    "status" text DEFAULT 'open' NOT NULL,
    "resolved_at" bigint,
    "resolved_by" text,
    "created_by" text NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_comment_messages" (
    "id" text PRIMARY KEY NOT NULL,
    "script_id" text NOT NULL,
    "thread_id" text NOT NULL,
    "author_id" text NOT NULL,
    "body" text NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "edited_at" bigint
);
--> statement-breakpoint
ALTER TABLE "script_comment_threads" ADD CONSTRAINT "script_comment_threads_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_comment_messages" ADD CONSTRAINT "script_comment_messages_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_comment_messages" ADD CONSTRAINT "script_comment_messages_thread_id_script_comment_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."script_comment_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "script_comment_threads_script_id_idx" ON "script_comment_threads" USING btree ("script_id");
--> statement-breakpoint
CREATE INDEX "script_comment_messages_thread_created_idx" ON "script_comment_messages" USING btree ("thread_id","created_at");
--> statement-breakpoint
CREATE INDEX "script_comment_messages_script_id_idx" ON "script_comment_messages" USING btree ("script_id");
