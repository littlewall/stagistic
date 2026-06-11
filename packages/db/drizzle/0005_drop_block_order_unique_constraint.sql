-- Ensure the unique index on (script_id, block_order) is gone.
-- Migration 0004 was supposed to drop it, but on some databases it
-- survived — either because 0004 failed mid-transaction (DDL + exec quirk
-- in PGlite) or because the DB was in a state between 0003 and 0004.
-- A unique constraint on block_order breaks fractional-index reorders:
-- PostgreSQL checks uniqueness row-by-row inside a single UPDATE, so
-- swapping keys between two blocks always triggers a violation.
DROP INDEX IF EXISTS "script_blocks_script_order_unique_idx";
