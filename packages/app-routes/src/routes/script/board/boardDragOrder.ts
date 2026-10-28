import type {WallAct} from './buildWallView';

/** Scene ids per act key, in the order the Wall shows them while a scene is dragged. */
export type BoardOrder = Readonly<Record<string, readonly string[]>>;

export const toBoardOrder = (acts: readonly WallAct[]): BoardOrder => Object.fromEntries(
    acts.map(act => [act.key, act.scenes.map(scene => scene.headingBlockId)]),
);

const locate = (order: BoardOrder, id: string) => {
    for (const [group, ids] of Object.entries(order)) {
        const index = ids.indexOf(id);

        if (index >= 0) return {group, index};
    }

    return null;
};

/*
 * The order after the dragged scene moves onto a target: another scene, whose place it
 * takes, or an act key (the act's end). Within an act this is an array move, so moving
 * forward lands after the target and moving back lands before it.
 */
export const moveInBoardOrder = (order: BoardOrder, sourceId: string, targetId: string): BoardOrder => {
    const from = locate(order, sourceId);
    const isActEnd = Object.hasOwn(order, targetId);
    const to = isActEnd ? {group: targetId, index: order[targetId].filter(id => id !== sourceId).length} : locate(order, targetId);

    if (!from || !to || sourceId === targetId) return order;

    const remaining = order[from.group].filter(id => id !== sourceId);
    const targetIds = from.group === to.group ? remaining : [...order[to.group]];

    targetIds.splice(to.index, 0, sourceId);

    if (from.group === to.group && targetIds.every((id, index) => order[from.group][index] === id)) return order;

    return {
        ...order,
        [from.group]: remaining,
        [to.group]: targetIds,
    };
};

/** Where the scene sits in the order: its act, and the scene it comes before (null at the act's end). */
export const findBoardPlacement = (order: BoardOrder, sceneId: string): {group: string, beforeSceneId: string | null} | null => {
    const found = locate(order, sceneId);

    return found ? {group: found.group, beforeSceneId: order[found.group][found.index + 1] ?? null} : null;
};

/** The acts with their scenes in the dragged order. */
export const applyBoardOrder = (acts: readonly WallAct[], order: BoardOrder | null): readonly WallAct[] => {
    if (!order) return acts;

    const sceneById = new Map(acts.flatMap(act => act.scenes.map(scene => [scene.headingBlockId, scene] as const)));

    return acts.map(act => ({
        ...act,
        scenes: (order[act.key] ?? []).flatMap(id => sceneById.get(id) ?? []),
    }));
};
