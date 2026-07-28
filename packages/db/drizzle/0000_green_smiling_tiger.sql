CREATE TABLE "script_acts" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"heading_block_id" text,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_block_annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"block_id" text NOT NULL,
	"layer_id" text NOT NULL,
	"annotation_type" text NOT NULL,
	"start_offset" integer,
	"end_offset" integer,
	"anchor_text" text,
	"payload_json" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_block_character_refs" (
	"block_id" text NOT NULL,
	"character_id" text NOT NULL,
	"character_key" text NOT NULL,
	"is_confirmed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "script_block_character_refs_block_character_key_pk" PRIMARY KEY("block_id","character_key")
);
--> statement-breakpoint
CREATE TABLE "script_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"block_type" text NOT NULL,
	"order_no" integer NOT NULL,
	"text_content" text DEFAULT '' NOT NULL,
	"content_json" text,
	"scene_id" text,
	"act_id" text,
	"column_group_id" text,
	"column_index" integer,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_character_genders" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"gender_key" text NOT NULL,
	"gender_label" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_characters" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"character_key" text NOT NULL,
	"color_hex" text,
	"gender_key" text,
	"notes" text,
	"backstory" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_config_blocks" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"block_type" text NOT NULL,
	"spacing_before_millis" integer,
	"line_height_millis" integer,
	"indent_left_chars" integer,
	"indent_right_chars" integer,
	"shortcut" text,
	"next_element" text,
	"text_align" text,
	"casing" text,
	"is_bold" boolean,
	"is_italic" boolean,
	"is_underline" boolean,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"namespace" text NOT NULL,
	"payload_json" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_costumes" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"character_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_cue_sheet_annotations" (
	"cue_sheet_id" text NOT NULL,
	"annotation_id" text NOT NULL,
	"order_no" integer NOT NULL,
	"notes" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "script_cue_sheet_annotations_cue_sheet_annotation_pk" PRIMARY KEY("cue_sheet_id","annotation_id")
);
--> statement-breakpoint
CREATE TABLE "script_cue_sheets" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"layer_id" text NOT NULL,
	"name" text NOT NULL,
	"cue_order_json" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_layers" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"name" text NOT NULL,
	"layer_type" text NOT NULL,
	"department" text NOT NULL,
	"color_hex" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"order_no" integer NOT NULL,
	"created_by" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_members" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"department" text,
	"character_id" text,
	"view_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"role" text NOT NULL,
	"resource_type" text NOT NULL,
	"action" text NOT NULL,
	"condition_json" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_props" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_scene_costumes" (
	"scene_id" text NOT NULL,
	"costume_id" text NOT NULL,
	"quick_change" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "script_scene_costumes_scene_costume_pk" PRIMARY KEY("scene_id","costume_id")
);
--> statement-breakpoint
CREATE TABLE "script_scene_props" (
	"scene_id" text NOT NULL,
	"prop_id" text NOT NULL,
	"notes" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "script_scene_props_scene_prop_pk" PRIMARY KEY("scene_id","prop_id")
);
--> statement-breakpoint
CREATE TABLE "script_scene_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"message" text,
	"blocks_json" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"heading_block_id" text,
	"scene_number" text,
	"color_hex" text,
	"synopsis" text,
	"location_id" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_views" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text NOT NULL,
	"name" text NOT NULL,
	"role_template" text,
	"config_json" text NOT NULL,
	"created_by" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	"active_block_id" text
);
--> statement-breakpoint
CREATE TABLE "sync_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"script_id" text,
	"op_type" text,
	"payload_json" text,
	"created_at" bigint,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "script_acts" ADD CONSTRAINT "script_acts_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_block_annotations" ADD CONSTRAINT "script_block_annotations_block_id_script_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."script_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_block_annotations" ADD CONSTRAINT "script_block_annotations_layer_id_script_layers_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."script_layers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_block_character_refs" ADD CONSTRAINT "script_block_character_refs_block_id_script_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."script_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_block_character_refs" ADD CONSTRAINT "script_block_character_refs_character_id_script_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."script_characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_scene_id_script_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."script_scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_act_id_script_acts_id_fk" FOREIGN KEY ("act_id") REFERENCES "public"."script_acts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_character_genders" ADD CONSTRAINT "script_character_genders_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_characters" ADD CONSTRAINT "script_characters_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_config_blocks" ADD CONSTRAINT "script_config_blocks_config_id_script_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."script_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_configs" ADD CONSTRAINT "script_configs_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_costumes" ADD CONSTRAINT "script_costumes_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_costumes" ADD CONSTRAINT "script_costumes_character_id_script_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."script_characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_cue_sheet_annotations" ADD CONSTRAINT "script_cue_sheet_annotations_cue_sheet_id_script_cue_sheets_id_fk" FOREIGN KEY ("cue_sheet_id") REFERENCES "public"."script_cue_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_cue_sheet_annotations" ADD CONSTRAINT "script_cue_sheet_annotations_annotation_id_script_block_annotations_id_fk" FOREIGN KEY ("annotation_id") REFERENCES "public"."script_block_annotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_cue_sheets" ADD CONSTRAINT "script_cue_sheets_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_cue_sheets" ADD CONSTRAINT "script_cue_sheets_layer_id_script_layers_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."script_layers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_layers" ADD CONSTRAINT "script_layers_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_locations" ADD CONSTRAINT "script_locations_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_members" ADD CONSTRAINT "script_members_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_members" ADD CONSTRAINT "script_members_character_id_script_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."script_characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_members" ADD CONSTRAINT "script_members_view_id_script_views_id_fk" FOREIGN KEY ("view_id") REFERENCES "public"."script_views"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_permissions" ADD CONSTRAINT "script_permissions_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_props" ADD CONSTRAINT "script_props_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scene_costumes" ADD CONSTRAINT "script_scene_costumes_scene_id_script_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."script_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scene_costumes" ADD CONSTRAINT "script_scene_costumes_costume_id_script_costumes_id_fk" FOREIGN KEY ("costume_id") REFERENCES "public"."script_costumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scene_props" ADD CONSTRAINT "script_scene_props_scene_id_script_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."script_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scene_props" ADD CONSTRAINT "script_scene_props_prop_id_script_props_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."script_props"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scene_versions" ADD CONSTRAINT "script_scene_versions_scene_id_script_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."script_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scenes" ADD CONSTRAINT "script_scenes_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_scenes" ADD CONSTRAINT "script_scenes_location_id_script_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."script_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_views" ADD CONSTRAINT "script_views_script_id_scripts_id_fk" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "script_acts_script_id_idx" ON "script_acts" USING btree ("script_id");--> statement-breakpoint
CREATE INDEX "script_block_annotations_block_type_idx" ON "script_block_annotations" USING btree ("block_id","annotation_type");--> statement-breakpoint
CREATE INDEX "script_block_annotations_layer_idx" ON "script_block_annotations" USING btree ("layer_id");--> statement-breakpoint
CREATE INDEX "script_block_annotations_block_layer_idx" ON "script_block_annotations" USING btree ("block_id","layer_id");--> statement-breakpoint
CREATE INDEX "script_block_annotations_status_idx" ON "script_block_annotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "script_block_character_refs_character_id_idx" ON "script_block_character_refs" USING btree ("character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_blocks_script_order_unique_idx" ON "script_blocks" USING btree ("script_id","order_no");--> statement-breakpoint
CREATE INDEX "script_blocks_script_type_idx" ON "script_blocks" USING btree ("script_id","block_type");--> statement-breakpoint
CREATE INDEX "script_blocks_script_scene_idx" ON "script_blocks" USING btree ("script_id","scene_id");--> statement-breakpoint
CREATE INDEX "script_blocks_script_act_idx" ON "script_blocks" USING btree ("script_id","act_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_character_genders_script_gender_unique_idx" ON "script_character_genders" USING btree ("script_id","gender_key");--> statement-breakpoint
CREATE INDEX "script_character_genders_script_id_idx" ON "script_character_genders" USING btree ("script_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_characters_script_character_unique_idx" ON "script_characters" USING btree ("script_id","character_key");--> statement-breakpoint
CREATE INDEX "script_characters_script_id_idx" ON "script_characters" USING btree ("script_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_config_blocks_config_block_type_unique_idx" ON "script_config_blocks" USING btree ("config_id","block_type");--> statement-breakpoint
CREATE INDEX "script_config_blocks_config_id_idx" ON "script_config_blocks" USING btree ("config_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_configs_script_namespace_unique_idx" ON "script_configs" USING btree ("script_id","namespace");--> statement-breakpoint
CREATE INDEX "script_configs_script_id_idx" ON "script_configs" USING btree ("script_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_costumes_script_character_name_unique_idx" ON "script_costumes" USING btree ("script_id","character_id","name");--> statement-breakpoint
CREATE INDEX "script_costumes_script_character_idx" ON "script_costumes" USING btree ("script_id","character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_cue_sheet_annotations_order_unique_idx" ON "script_cue_sheet_annotations" USING btree ("cue_sheet_id","order_no");--> statement-breakpoint
CREATE INDEX "script_cue_sheet_annotations_annotation_idx" ON "script_cue_sheet_annotations" USING btree ("annotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_cue_sheets_script_name_unique_idx" ON "script_cue_sheets" USING btree ("script_id","name");--> statement-breakpoint
CREATE INDEX "script_cue_sheets_layer_id_idx" ON "script_cue_sheets" USING btree ("layer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_layers_script_name_unique_idx" ON "script_layers" USING btree ("script_id","name");--> statement-breakpoint
CREATE INDEX "script_layers_script_department_idx" ON "script_layers" USING btree ("script_id","department");--> statement-breakpoint
CREATE INDEX "script_layers_script_order_idx" ON "script_layers" USING btree ("script_id","order_no");--> statement-breakpoint
CREATE UNIQUE INDEX "script_locations_script_name_unique_idx" ON "script_locations" USING btree ("script_id","name");--> statement-breakpoint
CREATE INDEX "script_locations_script_id_idx" ON "script_locations" USING btree ("script_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_members_script_user_unique_idx" ON "script_members" USING btree ("script_id","user_id");--> statement-breakpoint
CREATE INDEX "script_members_script_role_idx" ON "script_members" USING btree ("script_id","role");--> statement-breakpoint
CREATE INDEX "script_members_script_department_idx" ON "script_members" USING btree ("script_id","department");--> statement-breakpoint
CREATE INDEX "script_permissions_script_role_idx" ON "script_permissions" USING btree ("script_id","role");--> statement-breakpoint
CREATE INDEX "script_permissions_resource_action_idx" ON "script_permissions" USING btree ("script_id","resource_type","action");--> statement-breakpoint
CREATE UNIQUE INDEX "script_props_script_name_unique_idx" ON "script_props" USING btree ("script_id","name");--> statement-breakpoint
CREATE INDEX "script_scene_costumes_costume_id_idx" ON "script_scene_costumes" USING btree ("costume_id");--> statement-breakpoint
CREATE INDEX "script_scene_props_prop_id_idx" ON "script_scene_props" USING btree ("prop_id");--> statement-breakpoint
CREATE INDEX "script_scene_versions_scene_created_at_idx" ON "script_scene_versions" USING btree ("scene_id","created_at");--> statement-breakpoint
CREATE INDEX "script_scenes_script_id_idx" ON "script_scenes" USING btree ("script_id");--> statement-breakpoint
CREATE INDEX "script_scenes_script_location_idx" ON "script_scenes" USING btree ("script_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "script_views_script_name_unique_idx" ON "script_views" USING btree ("script_id","name");--> statement-breakpoint
CREATE INDEX "script_views_script_role_template_idx" ON "script_views" USING btree ("script_id","role_template");