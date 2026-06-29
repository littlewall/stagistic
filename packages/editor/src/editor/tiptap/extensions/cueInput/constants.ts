/*
 * Cue title compose is triggered by a single '#' inside a stage direction.
 * (A deliberate divergence from the `@@cue` on-disk syntax: `@@` collided with
 * the character-tag `@` and was fragile; `#` is a robust single-key trigger.
 * Import/export maps `#`-cues to `@@cue` per the syntax — that is the next spec.)
 */
export const CUE_TRIGGER_CHARACTER = '#';

/** Typing this as the cue title (case-insensitive) commits a `cueOut` instead. */
export const CUE_OUT_KEYWORD = 'out';

export const CUE_COMPOSE_OPEN_META = 'cue-compose-open';
export const CUE_COMPOSE_CLOSE_META = 'cue-compose-close';

/** Zero-width anchor inserted at the block end while a cue title is typed. */
export const CUE_COMPOSE_PLACEHOLDER = '​';

export const STAGE_DIRECTION_NODE_TYPE = 'stageDirection';
