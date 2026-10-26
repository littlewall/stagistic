CREATE INDEX IF NOT EXISTS script_blocks_text_search_idx
ON script_blocks USING gin (to_tsvector('simple', text_content));
