import type {ScriptBlockNodeType} from '../../syntax/blockTypeMapping';
import {ALL_BLOCK_SPECS} from '../specs';

const buildEnterFallbackByNodeType = (): Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>> => {
    const map: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>> = {};

    for (const spec of ALL_BLOCK_SPECS) {
        map[spec.nodeType] = spec.enterFallback;
    }

    return map;
};

const ENTER_FALLBACK_BY_NODE_TYPE = buildEnterFallbackByNodeType();

/**
 * Hardcoded default for the block type a user lands on after pressing
 * Enter from `nodeType`, when no user setting overrides it. Resolved
 * from BlockSpec.enterFallback. Unknown types fall back to the
 * input type (the user stays on the same block).
 */
export const getEnterFallback = (nodeType: ScriptBlockNodeType): ScriptBlockNodeType => {
    return ENTER_FALLBACK_BY_NODE_TYPE[nodeType] ?? nodeType;
};
