ALTER TABLE "script_cue_attachments" ADD COLUMN "role" text;
--> statement-breakpoint
WITH "ranked_attachments" AS (
	SELECT
		"cue_id",
		"attachment_id",
		row_number() OVER (
			PARTITION BY "cue_id"
			ORDER BY "created_at" DESC, "sort_order" DESC, "attachment_id" DESC
		) AS "attachment_rank"
	FROM "script_cue_attachments"
)
UPDATE "script_cue_attachments" AS "link"
SET "role" = CASE
	WHEN "ranked_attachments"."attachment_rank" = 1 THEN 'integrated_score'
	ELSE 'legacy_attachment:' || "link"."attachment_id"
END
FROM "ranked_attachments"
WHERE "link"."cue_id" = "ranked_attachments"."cue_id"
	AND "link"."attachment_id" = "ranked_attachments"."attachment_id";
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" ALTER COLUMN "role" SET DEFAULT 'integrated_score';
--> statement-breakpoint
ALTER TABLE "script_cue_attachments" ALTER COLUMN "role" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "script_cue_attachments_cue_role_unique_idx"
	ON "script_cue_attachments" USING btree ("cue_id", "role");
