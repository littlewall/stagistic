import type {EditorLiveStructureSnapshot} from '@stagistic/editor';
import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    normalizeActName,
    type ScriptBlockIndexSnapshot,
} from '@stagistic/script';

export const ROOT_ACT_GROUP = '__root__' as const;

export interface SceneItem {
    blockId: string;
    title: string;
}

export interface StructureGroup {
    /** ROOT_ACT_GROUP for scenes before any act, or the act block id. */
    groupId: string;
    /** null for ROOT_ACT_GROUP, otherwise the act name. */
    actName: string | null;
    scenes: SceneItem[];
}

export interface StructureState {
    groups: StructureGroup[];
    /** Maps any block id → the scene block id it belongs to (used for active highlight). */
    sceneAncestorByBlockId: ReadonlyMap<string, string>;
}

const EMPTY_STATE: StructureState = {
    groups: [{groupId: ROOT_ACT_GROUP, actName: null, scenes: []}],
    sceneAncestorByBlockId: new Map(),
};

// Identity-stable caches
const liveCache = new WeakMap<EditorLiveStructureSnapshot, StructureState>();
const indexCache = new WeakMap<ScriptBlockIndexSnapshot, StructureState>();

interface RawBlock {
    blockId: string;
    blockType: string;
    text: string;
    sceneBlockId?: string | null;
}

const buildState = (blocks: RawBlock[]): StructureState => {
    const groups: StructureGroup[] = [{groupId: ROOT_ACT_GROUP, actName: null, scenes: []}];
    const sceneAncestorByBlockId = new Map<string, string>();
    let currentSceneBlockId: string | null = null;

    for (const block of blocks) {
        if (!block.blockId) {
            continue;
        }

        if (block.blockType === ELEMENT_ACT) {
            groups.push({
                groupId: block.blockId,
                actName: normalizeActName(block.text),
                scenes: [],
            });
            currentSceneBlockId = null;
            continue;
        }

        if (block.blockType === ELEMENT_SCENE_HEADING) {
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

export const deriveStructureStateFromLive = (live: EditorLiveStructureSnapshot): StructureState => {
    if (live.rows.length === 0) {
        return EMPTY_STATE;
    }

    const cached = liveCache.get(live);

    if (cached) {
        return cached;
    }

    const blocks: RawBlock[] = live.rows.map(row => ({
        blockId: row.blockId,
        blockType: row.kind === 'act' ? ELEMENT_ACT : ELEMENT_SCENE_HEADING,
        text: row.kind === 'act' ? row.name : row.title,
    }));

    const result = buildState(blocks);

    liveCache.set(live, result);

    return result;
};

export const deriveStructureStateFromIndex = (
    snap: ScriptBlockIndexSnapshot | null,
): StructureState => {
    if (!snap || !Array.isArray(snap.blocks) || snap.blocks.length === 0) {
        return EMPTY_STATE;
    }

    const cached = indexCache.get(snap);

    if (cached) {
        return cached;
    }

    const blocks: RawBlock[] = snap.blocks
        .filter(b => b.blockId)
        .map(b => ({
            blockId: b.blockId,
            blockType: b.blockType,
            text: b.textContent,
            sceneBlockId: b.sceneBlockId,
        }));

    const result = buildState(blocks);

    indexCache.set(snap, result);

    return result;
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
