import {
    createNodeId,
    CUE_ID_ATTR,
    CUE_KIND_ATTR,
    CUE_MODE_ATTR,
    CUE_OUT_NODE_NAME,
    CUE_START_NODE_NAME,
    CUE_TITLE_ATTR,
    type CueMode,
} from '@stagistic/script';
import type {EditorState, Transaction} from '@tiptap/pm/state';

import {
    type ActiveScriptBlock,
    findScriptBlockByIdFromState,
    getActiveScriptBlockFromState,
} from '../../scriptCore';

const STAGE_DIRECTION_NODE_TYPE = 'stageDirection';

/**
 * Resolves the stage-direction block a cue should attach to: an explicit
 * block id (right-click / compose target) or, when null, the active block.
 * Returns null when the target is not a stage direction.
 */
export const resolveCueTargetBlock = (
    state: EditorState,
    blockId?: string | null,
): ActiveScriptBlock | null => {
    const block = blockId
        ? findScriptBlockByIdFromState(state, blockId)
        : getActiveScriptBlockFromState(state);

    return block && block.blockType === STAGE_DIRECTION_NODE_TYPE ? block : null;
};

/**
 * True when the block already holds a cue atom. A stage direction carries at
 * most one cue marker — a start OR an out, never both (§4.1).
 */
export const blockHasCueAtom = (block: ActiveScriptBlock): boolean => {
    let found = false;

    block.node.forEach(child => {
        if (child.type.name === CUE_START_NODE_NAME || child.type.name === CUE_OUT_NODE_NAME) {
            found = true;
        }
    });

    return found;
};

/** The single cue atom always sits at the end of the block (§4.1, §5.3). */
export const buildInsertCueStart = (
    state: EditorState,
    block: ActiveScriptBlock,
    title: string,
    mode: CueMode,
): Transaction => {
    const node = state.schema.nodes[CUE_START_NODE_NAME].create({
        [CUE_ID_ATTR]: createNodeId(),
        [CUE_MODE_ATTR]: mode,
        [CUE_TITLE_ATTR]: title,
        [CUE_KIND_ATTR]: null,
    });

    return state.tr.insert(block.to, node);
};

export const buildInsertCueOut = (
    state: EditorState,
    block: ActiveScriptBlock,
): Transaction => {
    const node = state.schema.nodes[CUE_OUT_NODE_NAME].create();

    return state.tr.insert(block.to, node);
};
