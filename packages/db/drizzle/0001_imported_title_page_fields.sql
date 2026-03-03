CREATE TABLE "script_title_page_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"field_key" text NOT NULL,
	"field_value" text NOT NULL,
	"order_no" integer NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "script_title_page_fields" ADD CONSTRAINT "script_title_page_fields_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "script_title_page_fields_script_order_unique_idx" ON "script_title_page_fields" USING btree ("script_id","order_no");
--> statement-breakpoint
CREATE INDEX "script_title_page_fields_script_id_idx" ON "script_title_page_fields" USING btree ("script_id");
