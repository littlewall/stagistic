ALTER TABLE "script_characters" ADD COLUMN "kind" text DEFAULT 'character' NOT NULL;
--> statement-breakpoint
CREATE TABLE "script_character_group_members" (
    "group_id" text NOT NULL,
    "character_id" text NOT NULL,
    CONSTRAINT "script_character_group_members_group_id_character_id_pk" PRIMARY KEY("group_id", "character_id")
);
--> statement-breakpoint
ALTER TABLE "script_character_group_members" ADD CONSTRAINT "script_character_group_members_group_id_script_characters_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."script_characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_character_group_members" ADD CONSTRAINT "script_character_group_members_character_id_script_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."script_characters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "script_character_group_members_character_id_idx" ON "script_character_group_members" USING btree ("character_id");
