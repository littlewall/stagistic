import {
    createNodeId,
    formatMusicNumber,
    MUSIC_DRAFT_ATTR,
    MUSIC_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type MusicMode,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {Node as ProseMirrorNode} from '@tiptap/pm/model';
import type {EditorState, Transaction} from '@tiptap/pm/state';

import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {
    type ActiveScriptBlock,
    findScriptBlockByIdFromState,
    getActiveScriptBlockFromState,
} from '../../scriptCore';

const STAGE_DIRECTION_NODE_TYPE = 'stageDirection';

/**
 * Resolves the stage-direction block a music should attach to: an explicit
 * block id (right-click / compose target) or, when null, the active block.
 * Returns null when the target is not a stage direction.
 */
export const resolveMusicTargetBlock = (
    state: EditorState,
    blockId?: string | null,
): ActiveScriptBlock | null => {
    const block = blockId
        ? findScriptBlockByIdFromState(state, blockId)
        : getActiveScriptBlockFromState(state);

    return block && block.blockType === STAGE_DIRECTION_NODE_TYPE ? block : null;
};

/**
 * True when the block already holds a music atom. A stage direction carries at
 * most one music marker — a start OR an out, never both (§4.1).
 */
export const blockHasMusicAtom = (block: ActiveScriptBlock): boolean => {
    let found = false;

    block.node.forEach(child => {
        if (child.type.name === MUSIC_START_NODE_NAME || child.type.name === MUSIC_OUT_NODE_NAME) {
            found = true;
        }
    });

    return found;
};

/** The single music atom always sits at the end of the block (§4.1, §5.3). */
export const buildInsertMusicStart = (
    state: EditorState,
    block: ActiveScriptBlock,
    title: string,
    mode: MusicMode,
    options: {
        musicId?: string,
        kind?: string | null,
        isDraft?: boolean,
    } = {},
): Transaction => {
    const node = state.schema.nodes[MUSIC_START_NODE_NAME].create({
        [MUSIC_ID_ATTR]: options.musicId ?? createNodeId(),
        [MUSIC_MODE_ATTR]: mode,
        [MUSIC_TITLE_ATTR]: title,
        [MUSIC_KIND_ATTR]: options.kind ?? null,
        [MUSIC_DRAFT_ATTR]: options.isDraft === true,
    });

    return state.tr.insert(block.to, node);
};

export const resolveNewMusicNumber = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
): string | null => {
    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const targetBlock = blocksById.get(blockId);

    if (!targetBlock) {
        return null;
    }

    const sceneMusic = snapshot.music.filter(music => {
        return blocksById.get(music.startBlockId)?.sceneBlockId === targetBlock.sceneBlockId;
    });
    const sceneNumber = sceneMusic[0]?.sceneNumber
        ?? snapshot.blocks.filter(block => block.blockType === 'scene' && block.orderNo <= targetBlock.orderNo).length;
    const indexInScene = sceneMusic.filter(music => {
        return (blocksById.get(music.startBlockId)?.orderNo ?? -1) < targetBlock.orderNo;
    }).length;

    return formatMusicNumber({
        sceneNumber,
        indexInScene,
        sceneMusicCount: sceneMusic.length + 1,
    });
};

export const buildInsertMusicOut = (
    state: EditorState,
    block: ActiveScriptBlock,
): Transaction => {
    const node = state.schema.nodes[MUSIC_OUT_NODE_NAME].create();

    return state.tr.insert(block.to, node);
};

type PositionRange = {
    from: number,
    to: number,
};

const findMusicOutRange = (state: EditorState, block: ActiveScriptBlock): PositionRange | null => {
    let range: PositionRange | null = null;

    state.doc.nodesBetween(block.from, block.to, (child, childPos) => {
        if (child.type.name === MUSIC_OUT_NODE_NAME) {
            range = {from: childPos, to: childPos + child.nodeSize};
        }
    });

    return range;
};

/**
 * Deletes a music-start atom. When it's an open music with a paired music-out
 * later in the doc (§3.1 pairing), both atoms are removed in one
 * transaction so a single undo restores both.
 */
export const buildDeleteMusicStart = (
    state: EditorState,
    pos: number,
    node: ProseMirrorNode,
): Transaction => {
    const musicId = node.attrs[MUSIC_ID_ATTR] as string;
    const snapshot = buildIndexSnapshotFromPmDoc(state.doc);
    const music = snapshot.music.find(candidate => candidate.musicId === musicId);
    const tr = state.tr;

    if (music?.mode === 'open' && music.endBlockId && music.endBlockId !== music.startBlockId) {
        const endBlock = findScriptBlockByIdFromState(state, music.endBlockId);
        const outRange = endBlock ? findMusicOutRange(state, endBlock) : null;

        if (outRange) {
            tr.delete(outRange.from, outRange.to);
        }
    }

    return tr.delete(pos, pos + node.nodeSize);
};
