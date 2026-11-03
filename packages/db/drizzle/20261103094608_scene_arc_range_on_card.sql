ALTER TABLE "script_scene_characters" DROP CONSTRAINT IF EXISTS "script_scene_characters_arc_value_check";
--> statement-breakpoint
ALTER TABLE "script_scene_characters" DROP CONSTRAINT IF EXISTS "script_scene_characters_arc_range";
--> statement-breakpoint
UPDATE "script_scene_characters" SET "arc_value" = "arc_value" * 33 WHERE "arc_value" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "script_scene_characters" ADD CONSTRAINT "script_scene_characters_arc_range" CHECK ("arc_value" BETWEEN -100 AND 100);
--> statement-breakpoint
ALTER TABLE "script_scene_characters" ADD COLUMN "on_card" boolean NOT NULL DEFAULT true;
