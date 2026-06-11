import {ALL_BLOCK_SPECS} from '../blocks/specs';
import type {FountainElementType} from './types';

/*
 * The identifier types and maps below are derived from FountainBlockSpec
 * entries (see packages/script/src/blocks/). One spec contributes one
 * entry to every map. To add a new block type, add a spec — do not edit
 * the maps directly.
 *
 * `ScriptBlockNodeType` / `ScriptBlockType` are derived via indexed
 * access on the `as const` array: each spec literal preserves its
 * `nodeType`/`blockType` as a literal type, and the union of those
 * literal types is the public identifier union.
 */

export type ScriptBlockNodeType = (typeof ALL_BLOCK_SPECS)[number]['nodeType'];
export type ScriptBlockType = (typeof ALL_BLOCK_SPECS)[number]['blockType'];

const buildBlockTypeByNodeType = (): Record<ScriptBlockNodeType, ScriptBlockType> => {
    const map = {} as Record<ScriptBlockNodeType, ScriptBlockType>;

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.nodeType] = spec.blockType;
    }

    return map;
};

const buildLegacyByNodeType = (): Record<ScriptBlockNodeType, FountainElementType> => {
    const map = {} as Record<ScriptBlockNodeType, FountainElementType>;

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.nodeType] = spec.legacyType;
    }

    return map;
};

const buildNodeTypeByBlockType = (): Record<ScriptBlockType, ScriptBlockNodeType> => {
    const map = {} as Record<ScriptBlockType, ScriptBlockNodeType>;

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.blockType] = spec.nodeType;
    }

    return map;
};

const buildNodeTypeByLegacy = (): Record<FountainElementType, ScriptBlockNodeType> => {
    const map = {} as Record<FountainElementType, ScriptBlockNodeType>;

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.legacyType] = spec.nodeType;
    }

    return map;
};

export const SCRIPT_BLOCK_TYPE_BY_NODE_TYPE = buildBlockTypeByNodeType();
export const LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE = buildLegacyByNodeType();

const SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE = buildNodeTypeByBlockType();
const SCRIPT_BLOCK_NODE_TYPE_BY_LEGACY_FOUNTAIN_BLOCK_TYPE = buildNodeTypeByLegacy();

const SCRIPT_BLOCK_NODE_TYPE_SET: ReadonlySet<string> = new Set(Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));
const SCRIPT_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));
const LEGACY_FOUNTAIN_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(
    Object.values(LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE),
);

export const SCRIPT_BLOCK_NODE_TYPES: ScriptBlockNodeType[] = Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE) as ScriptBlockNodeType[];
export const SCRIPT_BLOCK_TYPES: ScriptBlockType[] = Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE);

export const isScriptBlockNodeType = (value: unknown): value is ScriptBlockNodeType => {
    return typeof value === 'string' && SCRIPT_BLOCK_NODE_TYPE_SET.has(value);
};

export const isScriptBlockType = (value: unknown): value is ScriptBlockType => {
    return typeof value === 'string' && SCRIPT_BLOCK_TYPE_SET.has(value);
};

export const isLegacyFountainBlockType = (value: unknown): value is FountainElementType => {
    return typeof value === 'string' && LEGACY_FOUNTAIN_BLOCK_TYPE_SET.has(value);
};

export const getScriptBlockNodeTypeFromBlockType = (blockType: ScriptBlockType): ScriptBlockNodeType => {
    return SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[blockType];
};

export const getScriptBlockTypeFromNodeType = (nodeType: ScriptBlockNodeType): ScriptBlockType => {
    return SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

export const getLegacyFountainBlockTypeFromNodeType = (nodeType: ScriptBlockNodeType): FountainElementType => {
    return LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

export const resolveScriptBlockNodeType = (value: unknown): ScriptBlockNodeType | null => {
    if (isScriptBlockNodeType(value)) {
        return value;
    }

    if (isScriptBlockType(value)) {
        return SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[value];
    }

    if (isLegacyFountainBlockType(value)) {
        return SCRIPT_BLOCK_NODE_TYPE_BY_LEGACY_FOUNTAIN_BLOCK_TYPE[value];
    }

    return null;
};

export const resolveScriptBlockType = (value: unknown): ScriptBlockType | null => {
    const nodeType = resolveScriptBlockNodeType(value);

    if (!nodeType) {
        return null;
    }

    return SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};

export const resolveLegacyFountainBlockType = (value: unknown): FountainElementType | null => {
    const nodeType = resolveScriptBlockNodeType(value);

    if (!nodeType) {
        return null;
    }

    return LEGACY_FOUNTAIN_BLOCK_TYPE_BY_NODE_TYPE[nodeType];
};
