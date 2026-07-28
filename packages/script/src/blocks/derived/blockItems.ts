import type {ScriptBlockNodeType} from '../../syntax/blockTypeMapping';
import {ALL_BLOCK_SPECS} from '../specs';

export type BlockMeta = {
    id: string,
    nodeType: ScriptBlockNodeType,
    label: string,
};

/**
 * Derived list of block items used by toolbar/menu UI. Each entry maps
 * to a BlockSpec; order follows ALL_BLOCK_SPECS.
 */
export const buildBlockItems = (): BlockMeta[] => {
    return ALL_BLOCK_SPECS.map((spec: (typeof ALL_BLOCK_SPECS)[number]) => ({
        id: spec.listId,
        nodeType: spec.nodeType,
        label: spec.label,
    }));
};
