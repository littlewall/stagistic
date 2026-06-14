import type {EditorLiveStructureSnapshot} from '@stagistic/editor';
import {
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';

const ACT_BLOCK_TYPE = 'act';
const SCENE_BLOCK_TYPE = 'scene';

export const ROOT_ACT_GROUP = '__root__';

export interface SceneItem {
    blockId: string,
    title: string,
}

export interface StructureGroup {
    groupId: string,
    actName: string | null,
    scenes: SceneItem[],
}

export interface StructureState {
    groups: StructureGroup[],
    sceneAncestorByBlockId: ReadonlyMap<string, string>,
}

const EMPTY_STATE: StructureState = {
    groups: [
        {
            groupId: ROOT_ACT_GROUP, actName: null, scenes: [],
        },
    ],
    sceneAncestorByBlockId: new Map(),
};

interface RawBlock {
    blockId: string,
    blockType: string,
    text: string,
    sceneBlockId?: string | null,
}

const buildState = (blocks: RawBlock[]): StructureState => {
    const groups: StructureGroup[] = [
        {
            groupId: ROOT_ACT_GROUP, actName: null, scenes: [],
        },
    ];
    const sceneAncestorByBlockId = new Map<string, string>();
    let currentSceneBlockId: string | null = null;

    for (const block of blocks) {
        if (!block.blockId) {
            continue;
        }

        if (block.blockType === ACT_BLOCK_TYPE) {
            groups.push({
                groupId: block.blockId,
                actName: block.text,
                scenes: [],
            });
            currentSceneBlockId = null;
            continue;
        }

        if (block.blockType === SCENE_BLOCK_TYPE) {
            groups[groups.length - 1].scenes.push({
                blockId: block.blockId,
                title: block.text || 'Untitled scene',
            });
            currentSceneBlockId = block.blockId;
            sceneAncestorByBlockId.set(block.blockId, block.blockId);
            continue;
        }

        if (currentSceneBlockId) {
            sceneAncestorByBlockId.set(block.blockId, currentSceneBlockId);
        } else if (block.sceneBlockId) {
            sceneAncestorByBlockId.set(block.blockId, block.sceneBlockId);
        }
    }

    return {groups, sceneAncestorByBlockId};
};

export const deriveStructureStateFromLive = (
    live: EditorLiveStructureSnapshot,
): StructureState => {
    if (live.rows.length === 0) {
        return EMPTY_STATE;
    }

    const blocks: RawBlock[] = live.rows.map(row => ({
        blockId: row.blockId,
        blockType: row.kind === 'act' ? ACT_BLOCK_TYPE : SCENE_BLOCK_TYPE,
        text: row.kind === 'act' ? row.name : row.title,
    }));

    const result = buildState(blocks);

    if (live.sceneByBlockId.size > 0) {
        const mergedSceneAncestorByBlockId = new Map<string, string>(result.sceneAncestorByBlockId);

        live.sceneByBlockId.forEach((sceneBlockId, blockId) => {
            mergedSceneAncestorByBlockId.set(blockId, sceneBlockId);
        });

        return {...result, sceneAncestorByBlockId: mergedSceneAncestorByBlockId};
    }

    return result;
};

export const deriveStructureStateFromIndex = (
    snap: ScriptBlockIndexSnapshot | null,
): StructureState => {
    if (!snap || !Array.isArray(snap.blocks) || snap.blocks.length === 0) {
        return EMPTY_STATE;
    }

    const blocks: RawBlock[] = snap.blocks
        .filter(b => b.blockId)
        .map(b => ({
            blockId: b.blockId,
            blockType: b.blockType,
            text: b.textContent,
            sceneBlockId: b.sceneBlockId,
        }));

    return buildState(blocks);
};

export const resolveActiveSceneBlockId = (
    state: Pick<StructureState, 'sceneAncestorByBlockId' | 'groups'>,
    activeBlockId: string | null,
): string | null => {
    if (!activeBlockId) {
        return null;
    }

    const ancestor = state.sceneAncestorByBlockId.get(activeBlockId);

    if (ancestor) {
        return ancestor;
    }

    for (const group of state.groups) {
        for (const scene of group.scenes) {
            if (scene.blockId === activeBlockId) {
                return activeBlockId;
            }
        }
    }

    return null;
};
