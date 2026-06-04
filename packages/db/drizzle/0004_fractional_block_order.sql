-- Convert block_order from integer to text for fractional indexing.
-- Existing integer values become text representations; the first structural
-- save will reassign proper fractional index keys to all blocks.

DROP INDEX IF EXISTS "script_blocks_script_order_unique_idx";
ALTER TABLE "script_blocks" ALTER COLUMN "block_order" TYPE text USING "block_order"::text;
CREATE INDEX "script_blocks_script_order_idx" ON "script_blocks" ("script_id", "block_order");
