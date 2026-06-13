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

        const {operation} = event;

        if (!isSortableOperation(operation) || !operation.source) {
            return;
        }

        const sourceId = String(operation.source.id);

        const isScene = groups.some(group => group.scenes.some(s => s.blockId === sourceId));

        if (!isScene) {
            return;
        }

        const targetGroupId = operation.source.group != null ? String(operation.source.group) : ROOT_ACT_GROUP;
        const targetIndex = typeof operation.source.index === 'number' ? operation.source.index : 0;

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

const getFirstActGroupId = (groups: readonly StructureGroup[]): string | null => {
    return groups.find(g => g.groupId !== ROOT_ACT_GROUP)?.groupId ?? null;
};

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

    const hasActAnchor = targetGroupId !== ROOT_ACT_GROUP && targetGroupId !== getFirstActGroupId(groups);
    const sceneIds = targetGroup.scenes
        .filter(s => s.blockId !== sourceId)
        .map(s => s.blockId);
    const targetItems = hasActAnchor ? [targetGroupId, ...sceneIds] : sceneIds;

    if (targetIndex < targetItems.length) {
        return targetItems[targetIndex];
    }

    const targetGroupIdx = groups.findIndex(g => g.groupId === targetGroupId);

    for (let i = targetGroupIdx + 1; i < groups.length; i++) {
        if (groups[i].groupId !== ROOT_ACT_GROUP) {
            return groups[i].groupId;
        }
    }

    return null;
};

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
