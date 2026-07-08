export const SPLITTABLE_BLOCK_TYPES: ReadonlySet<string> = new Set([
    'stageDirection',
    'dialogue',
    'lyrics',
    'aside',
]);

export const ORPHAN_PUSHDOWN_TYPES: ReadonlySet<string> = new Set(['character', 'scene']);

export const MIN_SPLIT_LINES_BEFORE = 2;
export const MIN_SPLIT_LINES_AFTER = 2;
export const FIT_EPSILON_PX = 1;

export const isSplittableBlockType = (type: string | undefined): boolean => typeof type === 'string' && SPLITTABLE_BLOCK_TYPES.has(type);
export const isOrphanCandidateBlockType = (type: string | undefined): boolean => typeof type === 'string' && ORPHAN_PUSHDOWN_TYPES.has(type);

