import {ALL_BLOCK_SPECS} from '../blocks/specs';

export type ScriptBlockNodeType = (typeof ALL_BLOCK_SPECS)[number]['nodeType'];
export type ScriptBlockType = (typeof ALL_BLOCK_SPECS)[number]['blockType'];

const SCRIPT_BLOCK_TYPE_BY_NODE_TYPE = (() => {
    const map = {} as Record<ScriptBlockNodeType, ScriptBlockType>;

    for (const spec of ALL_BLOCK_SPECS) map[spec.nodeType] = spec.blockType;

    return map;
})();

const SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE = (() => {
    const map = {} as Record<ScriptBlockType, ScriptBlockNodeType>;

    for (const spec of ALL_BLOCK_SPECS) map[spec.blockType] = spec.nodeType;

    return map;
})();

const NODE_TYPE_SET: ReadonlySet<string> = new Set(Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));
const BLOCK_TYPE_SET: ReadonlySet<string> = new Set(Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE));

export const SCRIPT_BLOCK_NODE_TYPES = Object.keys(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE) as ScriptBlockNodeType[];
export const SCRIPT_BLOCK_TYPES = Object.values(SCRIPT_BLOCK_TYPE_BY_NODE_TYPE);

export const isScriptBlockNodeType = (v: unknown): v is ScriptBlockNodeType => typeof v === 'string' && NODE_TYPE_SET.has(v);
export const isScriptBlockType = (v: unknown): v is ScriptBlockType => typeof v === 'string' && BLOCK_TYPE_SET.has(v);

export const getScriptBlockNodeTypeFromBlockType = (b: ScriptBlockType): ScriptBlockNodeType => SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[b];
export const getScriptBlockTypeFromNodeType = (n: ScriptBlockNodeType): ScriptBlockType => SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[n];

export const resolveScriptBlockNodeType = (v: unknown): ScriptBlockNodeType | null => {
    return isScriptBlockNodeType(v) ? v : isScriptBlockType(v) ? SCRIPT_BLOCK_NODE_TYPE_BY_BLOCK_TYPE[v] : null;
};

export const resolveScriptBlockType = (v: unknown): ScriptBlockType | null => {
    const n = resolveScriptBlockNodeType(v);

    return n ? SCRIPT_BLOCK_TYPE_BY_NODE_TYPE[n] : null;
};
