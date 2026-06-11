import {
    SCRIPT_BLOCK_NODE_TYPES,
    type ScriptBlockNodeType,
} from '@stagistic/script';

import {normalizeFountainBlockType} from '../../blocks/fountain';
import {ALL_BLOCK_BINDINGS} from '../../blocks/registry';
import {createFountainNode} from './createFountainNode';

export const SCRIPT_BLOCK_NODE_NAMES: readonly ScriptBlockNodeType[] = SCRIPT_BLOCK_NODE_TYPES;

/**
 * Tiptap node definitions, one per block binding.
 */
export const FountainBlockNodes = ALL_BLOCK_BINDINGS.map(binding => createFountainNode({
    name: binding.spec.nodeType,
    legacyType: normalizeFountainBlockType(binding.spec.legacyType),
}));
