/*
 * Music title compose is triggered by a single '#' inside a stage direction.
 * (A deliberate divergence from the `@@music` on-disk syntax: `@@` collided with
 * the character-tag `@` and was fragile; `#` is a robust single-key trigger.
 * Import/export maps `#`-music to `@@music` per the syntax — that is the next spec.)
 */
export const MUSIC_TRIGGER_CHARACTER = '#';

/** Typing this as the music title (case-insensitive) commits a `musicOut` instead. */
export const MUSIC_OUT_KEYWORD = 'out';

export const MUSIC_COMPOSE_OPEN_META = 'music-compose-open';
export const MUSIC_COMPOSE_CLOSE_META = 'music-compose-close';

/** Zero-width anchor inserted at the block end while a music title is typed. */
export const MUSIC_COMPOSE_PLACEHOLDER = '​';

export const STAGE_DIRECTION_NODE_TYPE = 'stageDirection';
