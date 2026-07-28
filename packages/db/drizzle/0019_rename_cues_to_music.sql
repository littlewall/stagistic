ALTER TABLE "script_cues" RENAME TO "script_music";
--> statement-breakpoint
ALTER TABLE "script_music" RENAME CONSTRAINT "script_cues_pkey" TO "script_music_pkey";
--> statement-breakpoint
ALTER TABLE "script_music" RENAME CONSTRAINT "script_cues_script_id_scripts_id_fk" TO "script_music_script_id_scripts_id_fk";
--> statement-breakpoint
ALTER INDEX "script_cues_script_id_idx" RENAME TO "script_music_script_id_idx";
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" RENAME TO "script_music_attachments";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME COLUMN "cue_id" TO "music_id";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME CONSTRAINT "script_cue_attachments_cue_attachment_pk" TO "script_music_attachments_music_attachment_pk";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME CONSTRAINT "script_cue_attachments_cue_id_script_cues_id_fk" TO "script_music_attachments_music_id_script_music_id_fk";
--> statement-breakpoint
ALTER TABLE "script_music_attachments" RENAME CONSTRAINT "script_cue_attachments_attachment_id_script_attachments_id_fk" TO "script_music_attachments_attachment_id_script_attachments_id_fk";
--> statement-breakpoint
ALTER INDEX "script_cue_attachments_cue_role_unique_idx" RENAME TO "script_music_attachments_music_role_unique_idx";
--> statement-breakpoint
ALTER INDEX "script_cue_attachments_cue_id_idx" RENAME TO "script_music_attachments_music_id_idx";
--> statement-breakpoint
ALTER INDEX "script_cue_attachments_attachment_id_idx" RENAME TO "script_music_attachments_attachment_id_idx";
--> statement-breakpoint
UPDATE "script_blocks"
SET "content_json" = replace(
	replace(
		replace("content_json", '"type":"cueStart"', '"type":"musicStart"'),
		'"type":"cueOut"', '"type":"musicOut"'
	),
	'"cueId":', '"musicId":'
)
WHERE "content_json" LIKE '%"cueStart"%'
	OR "content_json" LIKE '%"cueOut"%'
	OR "content_json" LIKE '%"cueId"%';
--> statement-breakpoint
UPDATE "sync_outbox"
SET
	"op_type" = replace("op_type", 'cue.', 'music.'),
	"payload_json" = replace(
		replace(
			replace("payload_json", '"operationType":"cue.', '"operationType":"music.'),
			'"entityKey":"cue:', '"entityKey":"music:'
		),
		'"cueId":', '"musicId":'
	)
WHERE "op_type" LIKE 'cue.%'
	OR "payload_json" LIKE '%"operationType":"cue.%'
	OR "payload_json" LIKE '%"entityKey":"cue:%'
	OR "payload_json" LIKE '%"cueId"%';
