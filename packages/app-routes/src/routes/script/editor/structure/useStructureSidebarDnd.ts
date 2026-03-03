import {useCallback} from 'react';

import type {
    DragEndEvent,
    SortableCandidate,
    SortableMeta,
    UseStructureSidebarDndArgs,
} from './types';

const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.trunc(value);
};

const toBlockId = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();

        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return null;
};

const getSortableMeta = (candidate: SortableCandidate): SortableMeta => {
    if (!candidate) {
        return {
            index: null,
        };
    }

    return {
        index: toFiniteNumber(candidate.sortable?.index) ?? toFiniteNumber(candidate.index),
    };
};

export const useStructureSidebarDnd = ({
    rows,
    rowByBlockId,
    rowIndexByBlockId,
    actions,
}: UseStructureSidebarDndArgs) => {
    return useCallback((event: DragEndEvent) => {
        if (event.canceled) {
            return;
        }

        const sourceCandidate = event.operation.source;
        const targetCandidate = event.operation.target;
        const sourceBlockId = toBlockId(sourceCandidate?.id);

        if (!sourceBlockId) {
            return;
        }

        const sourceRow = rowByBlockId.get(sourceBlockId);
        const sourceIndex = rowIndexByBlockId.get(sourceBlockId);

        if (!sourceRow || sourceIndex === undefined) {
            return;
        }

        const rowsWithoutSource = rows.filter(row => row.blockId !== sourceBlockId);
        const sourceSortableMeta = getSortableMeta(sourceCandidate);
        const targetSortableMeta = getSortableMeta(targetCandidate);
        const targetBlockId = toBlockId(targetCandidate?.id);
        let destinationIndex = targetSortableMeta.index ?? sourceSortableMeta.index;

        if (destinationIndex === null && targetBlockId) {
            const targetRowIndex = rowsWithoutSource.findIndex(row => row.blockId === targetBlockId);

            if (targetRowIndex >= 0) {
                destinationIndex = targetRowIndex;
            }
        }

        if (destinationIndex === null) {
            return;
        }

        const clampedDestinationIndex = Math.max(
            0,
            Math.min(destinationIndex, rowsWithoutSource.length),
        );
        const beforeBlockId = rowsWithoutSource[clampedDestinationIndex]?.blockId ?? null;
        const currentBeforeBlockId = rows[sourceIndex + 1]?.blockId ?? null;

        if (beforeBlockId === currentBeforeBlockId) {
            return;
        }

        if (sourceRow.kind !== 'scene') {
            return;
        }

        actions.onFocusBlock(sourceRow.blockId);
        actions.onReorderScene(sourceRow.blockId, beforeBlockId);
    }, [
        actions,
        rowByBlockId,
        rowIndexByBlockId,
        rows,
    ]);
};
