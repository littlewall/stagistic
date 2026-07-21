import {
    SCRIPT_BLOCK_NODE_TYPES,
    type ScriptBlockNodeType,
} from '@stagistic/script';

import {ALL_BLOCK_BINDINGS} from '../../blocks/registry';
import {normalizeBlockNodeType} from '../../blocks/script';
import {createScriptNode} from './createScriptNode';

export {MusicOutNode} from './MusicOutNode';
export {MusicStartNode} from './MusicStartNode';

export const SCRIPT_BLOCK_NODE_NAMES: readonly ScriptBlockNodeType[] = SCRIPT_BLOCK_NODE_TYPES;

/**
 * Tiptap node definitions, one per block binding.
 */
export const ScriptBlockNodes = ALL_BLOCK_BINDINGS.map(binding => createScriptNode({
    name: binding.spec.nodeType,
    blockType: normalizeBlockNodeType(binding.spec.nodeType),
}));
