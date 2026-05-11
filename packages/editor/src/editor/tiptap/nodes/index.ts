import {
    SCRIPT_BLOCK_NODE_TYPES,
    type ScriptBlockNodeType,
} from '@stagistic/script';

import {type FountainBlockType, normalizeFountainBlockType} from '../../blocks/fountain';
import {ALL_BLOCK_BINDINGS} from '../../blocks/registry';
import {createFountainNode} from './createFountainNode';

export const SCRIPT_BLOCK_NODE_NAMES: readonly ScriptBlockNodeType[] = SCRIPT_BLOCK_NODE_TYPES;

/**
 * Tiptap node definitions, one per block binding. Each entry is produced
 * by `createFountainNode({name, legacyType})` from the binding's spec.
 * The legacyType is normalised through `normalizeFountainBlockType` —
 * specs never use ELEMENT_DUAL_DIALOGUE (the wrapper type), but the
 * type system can't see that, so the normaliser narrows the static type.
 */
export const FountainBlockNodes = ALL_BLOCK_BINDINGS.map(binding => createFountainNode({
    name: binding.spec.nodeType,
    legacyType: normalizeFountainBlockType(binding.spec.legacyType) as FountainBlockType,
}));
