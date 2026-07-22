import {
    type DerivedMusic,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';
import type {EditorState, Transaction} from '@tiptap/pm/state';

import {buildIndexSnapshotFromPmDoc} from '../../../runtime/buildIndexSnapshotFromPmDoc';
import {
    type ActiveScriptBlock,
    findScriptBlockByIdFromState,
} from '../../scriptCore';

export interface MusicAtomRange {
    from: number,
    to: number,
}

export const findMusicAtomRange = (
    block: ActiveScriptBlock,
    nodeName: typeof MUSIC_OUT_NODE_NAME | typeof MUSIC_START_NODE_NAME,
): MusicAtomRange | null => {
    let range: MusicAtomRange | null = null;

    block.node.forEach((child, offset) => {
        if (child.type.name === nodeName) {
            const from = block.from + offset;

            range = {from, to: from + child.nodeSize};
        }
    });

    return range;
};

export const resolveMusicOutCandidate = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
): DerivedMusic | null => {
    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const targetBlock = blocksById.get(blockId);

    if (!targetBlock) {
        return null;
    }

    return snapshot.music
        .filter(music => {
            const startBlock = blocksById.get(music.startBlockId);

            return music.mode === 'open'
                && startBlock !== undefined
                && startBlock.orderNo < targetBlock.orderNo
                && startBlock.sceneBlockId === targetBlock.sceneBlockId;
        })
        .sort((left, right) => {
            const leftOrder = blocksById.get(left.startBlockId)?.orderNo ?? -1;
            const rightOrder = blocksById.get(right.startBlockId)?.orderNo ?? -1;

            return rightOrder - leftOrder;
        })[0] ?? null;
};

export const buildSetMusicOutAtBlock = (
    state: EditorState,
    blockId: string,
): Transaction | null => {
    const targetBlock = findScriptBlockByIdFromState(state, blockId);

    if (!targetBlock || findMusicAtomRange(targetBlock, MUSIC_OUT_NODE_NAME)) {
        return null;
    }

    const snapshot = buildIndexSnapshotFromPmDoc(state.doc);
    const music = resolveMusicOutCandidate(snapshot, blockId);

    if (!music) {
        return null;
    }

    const tr = state.tr;

    if (music.endBlockId) {
        const previousEndBlock = findScriptBlockByIdFromState(state, music.endBlockId);
        const previousOut = previousEndBlock
            ? findMusicAtomRange(previousEndBlock, MUSIC_OUT_NODE_NAME)
            : null;

        if (previousOut) {
            tr.delete(previousOut.from, previousOut.to);
        }
    }

    const startRange = findMusicAtomRange(targetBlock, MUSIC_START_NODE_NAME);
    const insertionPos = tr.mapping.map(startRange?.from ?? targetBlock.to, 1);
    const outNode = state.schema.nodes[MUSIC_OUT_NODE_NAME].create();

    return tr.insert(insertionPos, outNode).scrollIntoView();
};

export const buildRemoveMusicOutAtBlock = (
    state: EditorState,
    blockId: string,
): Transaction | null => {
    const block = findScriptBlockByIdFromState(state, blockId);
    const range = block ? findMusicAtomRange(block, MUSIC_OUT_NODE_NAME) : null;

    return range ? state.tr.delete(range.from, range.to).scrollIntoView() : null;
};

export const buildMoveOrphanMusicOut = (
    state: EditorState,
    sourceBlockId: string,
    targetBlockId: string,
): Transaction | null => {
    if (sourceBlockId === targetBlockId) {
        return null;
    }

    const sourceBlock = findScriptBlockByIdFromState(state, sourceBlockId);
    const targetBlock = findScriptBlockByIdFromState(state, targetBlockId);
    const sourceOut = sourceBlock
        ? findMusicAtomRange(sourceBlock, MUSIC_OUT_NODE_NAME)
        : null;

    if (!sourceOut || !targetBlock || findMusicAtomRange(targetBlock, MUSIC_OUT_NODE_NAME)) {
        return null;
    }

    const snapshot = buildIndexSnapshotFromPmDoc(state.doc);

    if (!snapshot.orphanMusicOutBlockIds.includes(sourceBlockId)
        || !resolveMusicOutCandidate(snapshot, targetBlockId)) {
        return null;
    }

    const targetStart = findMusicAtomRange(targetBlock, MUSIC_START_NODE_NAME);
    const transaction = state.tr.delete(sourceOut.from, sourceOut.to);
    const insertionPos = transaction.mapping.map(targetStart?.from ?? targetBlock.to, 1);
    const outNode = state.schema.nodes[MUSIC_OUT_NODE_NAME].create();

    return transaction.insert(insertionPos, outNode).scrollIntoView();
};
