import {isSortableOperation} from '@dnd-kit/react/sortable';
import {useCallback} from 'react';

import {ROOT_ACT_GROUP, type StructureGroup} from './structureRows';
import type {DragEndEvent, UseStructureSidebarDndArgs} from './types';

export const useStructureSidebarDnd = ({
    groups,
    onReorderScene,
}: UseStructureSidebarDndArgs) => {
    return useCallback((event: DragEndEvent) => {
        if (event.canceled) {
            return;
        }

        if (!isSortableOperation(event.operation)) {
            return;
        }

        const source = event.operation.source;

        if (!source) {
            return;
        }

        const sourceId = String(source.id);
        const targetGroupId = source.group != null ? String(source.group) : ROOT_ACT_GROUP;
        const targetIndex = typeof source.index === 'number' ? source.index : 0;

        const newBeforeBlockId = computeBeforeBlockId(groups, sourceId, targetGroupId, targetIndex);
        const currentBeforeBlockId = computeCurrentBeforeBlockId(groups, sourceId);

        if (newBeforeBlockId === currentBeforeBlockId) {
            return;
        }

        if (newBeforeBlockId === sourceId) {
            return;
        }

        onReorderScene(sourceId, newBeforeBlockId);
    }, [groups, onReorderScene]);
};

/**
 * Find what `beforeBlockId` should be for `sourceId` if it ends up at `targetIndex`
 * inside group `targetGroupId` (post-drag position from dnd-kit's sortable state).
 *
 * The target group's scenes are filtered to exclude the source. Then:
 *   - position < length → that scene's id
 *   - position === length (source ends up last) → next non-ROOT group's id
 *   - no further groups → null (append at end)
 */
const computeBeforeBlockId = (
    groups: readonly StructureGroup[],
    sourceId: string,
    targetGroupId: string,
    targetIndex: number,
): string | null => {
    const targetGroup = groups.find(g => g.groupId === targetGroupId);

    if (!targetGroup) {
        return null;
    }

    const targetScenes = targetGroup.scenes.filter(s => s.blockId !== sourceId);

    if (targetIndex < targetScenes.length) {
        return targetScenes[targetIndex].blockId;
    }

    // Source is last in target group — find next non-ROOT group
    const targetGroupIdx = groups.findIndex(g => g.groupId === targetGroupId);

    for (let i = targetGroupIdx + 1; i < groups.length; i++) {
        if (groups[i].groupId !== ROOT_ACT_GROUP) {
            return groups[i].groupId;
        }
    }

    return null;
};

/** Find the current `beforeBlockId` for `sourceId` in the existing groups (pre-drag state). */
const computeCurrentBeforeBlockId = (
    groups: readonly StructureGroup[],
    sourceId: string,
): string | null => {
    for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const idx = group.scenes.findIndex(s => s.blockId === sourceId);

        if (idx === -1) {
            continue;
        }

        if (idx + 1 < group.scenes.length) {
            return group.scenes[idx + 1].blockId;
        }

        for (let ni = gi + 1; ni < groups.length; ni++) {
            if (groups[ni].groupId !== ROOT_ACT_GROUP) {
                return groups[ni].groupId;
            }
        }

        return null;
    }

    return null;
};
