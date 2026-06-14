import {
    ALL_BLOCK_SPECS,
    DEFAULT_SCRIPT_BLOCK_NODE_TYPE,
    resolveScriptBlockNodeType,
    type ScriptBlockNodeType,
} from '@stagistic/script';

/**
 * Editor-local block-type union. Derived from `ALL_BLOCK_SPECS`; this is
 * the set of block node types backed by an actual block spec.
 */
export const BLOCK_NODE_TYPES = ALL_BLOCK_SPECS.map(spec => spec.nodeType);

export type BlockNodeType = ScriptBlockNodeType;

const BLOCK_NODE_TYPE_SET = new Set<string>(BLOCK_NODE_TYPES);

const DEFAULT_BLOCK_NODE_TYPE: BlockNodeType = DEFAULT_SCRIPT_BLOCK_NODE_TYPE;

export const isBlockNodeType = (value: unknown): value is BlockNodeType => {
    return typeof value === 'string' && BLOCK_NODE_TYPE_SET.has(value);
};

export const normalizeBlockNodeType = (value: unknown): BlockNodeType => {
    return resolveScriptBlockNodeType(value) ?? DEFAULT_BLOCK_NODE_TYPE;
};
