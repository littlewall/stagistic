import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {
    resolveMusicRailBlockBottom,
    resolveMusicRailBlockTop,
    resolveMusicRailLeft,
} from './musicRailDom';
import {canDropMusicOutAtBoundary} from './musicRangeModel';

type MusicRailDragClassNames = {
    dropPreview: string,
    eligibleTarget: string,
    rangePreview: string,
};

const isOccupiedEndBoundary = (
    snapshot: ScriptBlockIndexSnapshot,
    blockId: string,
) => {
    return snapshot.orphanMusicOutBlockIds.includes(blockId)
        || snapshot.music.some(music => music.endBlockId === blockId);
};

export const isEligibleMusicRailDropTarget = (
    snapshot: ScriptBlockIndexSnapshot,
    musicId: string | null,
    sourceBlockId: string,
    targetBlockId: string,
) => {
    return targetBlockId !== sourceBlockId
        && !isOccupiedEndBoundary(snapshot, targetBlockId)
        && canDropMusicOutAtBoundary(snapshot, musicId, targetBlockId);
};

const resolveStartBlockId = (
    snapshot: ScriptBlockIndexSnapshot,
    musicId: string | null,
    targetBlockId: string,
) => {
    if (musicId) {
        return snapshot.music.find(music => music.musicId === musicId)?.startBlockId ?? null;
    }

    const blocksById = new Map(snapshot.blocks.map(block => [block.blockId, block] as const));
    const target = blocksById.get(targetBlockId);

    if (!target) {
        return null;
    }

    return snapshot.music
        .filter(music => {
            const start = blocksById.get(music.startBlockId);

            return music.mode === 'open'
                && start?.sceneBlockId === target.sceneBlockId
                && start.orderNo < target.orderNo;
        })
        .sort((left, right) => {
            const leftOrder = blocksById.get(left.startBlockId)?.orderNo ?? -1;
            const rightOrder = blocksById.get(right.startBlockId)?.orderNo ?? -1;

            return rightOrder - leftOrder;
        })[0]?.startBlockId ?? null;
};

const createMarker = (
    canvas: HTMLElement,
    className: string,
    blockId: string,
    top: number,
    dataAttribute: 'musicRailDropPreview' | 'musicRailDropTarget',
) => {
    const marker = document.createElement('span');

    marker.className = className;
    marker.dataset[dataAttribute] = 'true';
    marker.dataset.blockId = blockId;
    marker.style.left = `${resolveMusicRailLeft(canvas)}px`;
    marker.style.top = `${top}px`;
    marker.ariaHidden = 'true';
    canvas.appendChild(marker);

    return marker;
};

export const createMusicRailDragView = (
    editor: TiptapEditor,
    canvas: HTMLElement,
    classNames: MusicRailDragClassNames,
) => {
    let dropPreview: HTMLElement | null = null;
    let rangePreview: HTMLElement | null = null;
    let eligibleTargets: HTMLElement[] = [];

    const clearPreview = () => {
        dropPreview?.remove();
        rangePreview?.remove();
        dropPreview = null;
        rangePreview = null;
    };
    const clear = () => {
        clearPreview();
        eligibleTargets.forEach(target => target.remove());
        eligibleTargets = [];
    };
    const showEligibleTargets = (
        snapshot: ScriptBlockIndexSnapshot,
        musicId: string | null,
        sourceBlockId: string,
    ) => {
        eligibleTargets.forEach(target => target.remove());
        eligibleTargets = snapshot.blocks.flatMap(block => {
            if (!isEligibleMusicRailDropTarget(snapshot, musicId, sourceBlockId, block.blockId)) {
                return [];
            }

            const top = resolveMusicRailBlockTop(editor, canvas, block.blockId);

            return top === null
                ? []
                : [
                    createMarker(
                        canvas,
                        classNames.eligibleTarget,
                        block.blockId,
                        top,
                        'musicRailDropTarget',
                    ),
                ];
        });
    };
    const showPreview = (
        snapshot: ScriptBlockIndexSnapshot,
        musicId: string | null,
        blockId: string,
    ) => {
        if (dropPreview?.dataset.blockId === blockId && dropPreview.isConnected) {
            return;
        }

        clearPreview();

        const targetTop = resolveMusicRailBlockTop(editor, canvas, blockId);
        const startBlockId = resolveStartBlockId(snapshot, musicId, blockId);
        const startTop = startBlockId
            ? resolveMusicRailBlockBottom(editor, canvas, startBlockId)
            : null;

        if (targetTop === null) {
            return;
        }

        dropPreview = createMarker(
            canvas,
            classNames.dropPreview,
            blockId,
            targetTop,
            'musicRailDropPreview',
        );

        if (startTop === null || startTop === targetTop) {
            return;
        }

        rangePreview = document.createElement('span');
        rangePreview.className = classNames.rangePreview;
        rangePreview.dataset.musicRailDropRangePreview = 'true';
        rangePreview.style.left = `${resolveMusicRailLeft(canvas)}px`;
        rangePreview.style.top = `${Math.min(startTop, targetTop)}px`;
        rangePreview.style.height = `${Math.abs(targetTop - startTop)}px`;
        rangePreview.ariaHidden = 'true';
        canvas.appendChild(rangePreview);
    };

    return {
        clear,
        clearPreview,
        showEligibleTargets,
        showPreview,
    };
};
