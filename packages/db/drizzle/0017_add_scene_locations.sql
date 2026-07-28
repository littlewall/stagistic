CREATE TABLE "script_scene_locations" (
	"scene_id" text NOT NULL,
	"location_id" text NOT NULL,
	CONSTRAINT "script_scene_locations_scene_id_location_id_pk" PRIMARY KEY("scene_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "script_scene_locations" ADD CONSTRAINT "script_scene_locations_scene_id_script_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."script_scenes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "script_scene_locations" ADD CONSTRAINT "script_scene_locations_location_id_script_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."script_locations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "script_scene_locations_location_id_idx" ON "script_scene_locations" USING btree ("location_id");
--> statement-breakpoint
INSERT INTO "script_scene_locations" ("scene_id", "location_id")
SELECT "id", "location_id"
FROM "script_scenes"
WHERE "location_id" IS NOT NULL
ON CONFLICT DO NOTHING;
