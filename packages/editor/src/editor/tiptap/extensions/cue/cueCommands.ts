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

const firstCueStartPos = (block: ActiveScriptBlock): number | null => {
    let result: number | null = null;
    let offset = 0;

    block.node.forEach(child => {
        if (result === null && child.type.name === CUE_START_NODE_NAME) {
            result = block.from + offset;
        }

        offset += child.nodeSize;
    });

    return result;
};

/** A new cue start always appends at the very end of the block (§4.1, §5.3). */
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

/** An out goes before any trailing cue start (close-then-open ordering, §4.1). */
export const buildInsertCueOut = (
    state: EditorState,
    block: ActiveScriptBlock,
): Transaction => {
    const node = state.schema.nodes[CUE_OUT_NODE_NAME].create();
    const insertAt = firstCueStartPos(block) ?? block.to;

    return state.tr.insert(insertAt, node);
};
