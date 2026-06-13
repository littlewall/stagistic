import {
    ALL_BLOCK_SPECS,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainElementType,
    normalizeEditorSettingsBlockType,
} from '@stagistic/script';

/**
 * Editor-local block-type union. Derived from `ALL_BLOCK_SPECS`; this is
 * the set of legacy element identifiers backed by an actual block spec.
 */
export const FOUNTAIN_BLOCK_TYPES = ALL_BLOCK_SPECS.map(spec => spec.legacyType);

export type FountainBlockType = (typeof ALL_BLOCK_SPECS)[number]['legacyType'];

const FOUNTAIN_BLOCK_TYPE_SET = new Set<FountainElementType>(FOUNTAIN_BLOCK_TYPES);

const DEFAULT_BLOCK_TYPE: FountainBlockType = ELEMENT_STAGE_DIRECTIONS;

export const isFountainBlockType = (value: unknown): value is FountainBlockType => {
    return typeof value === 'string' && FOUNTAIN_BLOCK_TYPE_SET.has(value as FountainElementType);
};

export const normalizeFountainBlockType = (value: unknown): FountainBlockType => {
    const normalized = normalizeEditorSettingsBlockType(value);

    return normalized && isFountainBlockType(normalized)
        ? normalized
        : DEFAULT_BLOCK_TYPE;
};
