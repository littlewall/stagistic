ALTER TABLE "script_cues" DROP COLUMN "cue_number";--> statement-breakpoint
ALTER TABLE "script_cues" ADD COLUMN "scene_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "script_cues" ADD COLUMN "index_in_scene" integer DEFAULT 0 NOT NULL;
