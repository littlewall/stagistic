ALTER TABLE "script_cue_attachments"
	ALTER COLUMN "sort_order" TYPE bigint
	USING "sort_order"::bigint;
