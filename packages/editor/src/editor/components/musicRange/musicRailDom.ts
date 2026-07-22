import type {DerivedMusic} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';

import {resolveScriptBlockElementById} from '../blockActions/overlay/geometry';
import type {MusicRailBoundary} from './musicRangeModel';

type RangeGeometry = {
    left: number,
    top: number,
    height: number,
};

export const escapeMusicRailSelector = (value: string) => {
    return globalThis.CSS?.escape?.(value) ?? value.replace(/["\\]/gu, '\\$&');
};

const findBoundary = (
    canvas: HTMLElement,
    attribute: 'startMusicId' | 'endMusicId',
    musicId: string,
) => {
    const dataAttribute = attribute.replace(/[A-Z]/gu, match => `-${match.toLowerCase()}`);
    const selector = `[data-music-rail-boundary="true"][data-${dataAttribute}="${escapeMusicRailSelector(musicId)}"]`;

    return canvas.querySelector<HTMLElement>(selector);
};

const resolveRangeGeometry = (
    canvas: HTMLElement,
    music: DerivedMusic,
): RangeGeometry | null => {
    if (music.mode === 'hit') {
        return null;
    }

    const start = findBoundary(canvas, 'startMusicId', music.musicId);
    const end = findBoundary(canvas, 'endMusicId', music.musicId);

    if (!start || !end) {
        return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    const startY = startRect.top - canvasRect.top + canvas.scrollTop + startRect.height / 2;
    const endY = endRect.top - canvasRect.top + canvas.scrollTop + endRect.height / 2;

    if (startY === endY) {
        return null;
    }

    return {
        left: startRect.left - canvasRect.left + canvas.scrollLeft + startRect.width / 2,
        top: Math.min(startY, endY),
        height: Math.abs(endY - startY),
    };
};

const markerLabels: Record<MusicRailBoundary['markerKind'], string> = {
    none: 'Music actions',
    start: 'Music start',
    hit: 'Music hit',
    end: 'Music end',
    shared: 'Music transition',
    orphan: 'Invalid music end',
};

export const resolveMusicRailLeft = (canvas: HTMLElement) => {
    const inset = Number.parseFloat(getComputedStyle(canvas).getPropertyValue('--music-rail-inset')) || 32;

    return canvas.scrollLeft + canvas.clientWidth - inset;
};

export const resolveMusicRailBlockTop = (
    editor: TiptapEditor,
    canvas: HTMLElement,
    blockId: string,
) => {
    const block = resolveScriptBlockElementById(editor, blockId);

    if (!block || !canvas.contains(block)) {
        return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    const computed = getComputedStyle(block);
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const fontSize = Number.parseFloat(computed.fontSize);
    const lineHeight = Number.isFinite(fontSize) && fontSize > 0
        ? fontSize * 1.2
        : 13 * 1.7;

    return blockRect.top - canvasRect.top + canvas.scrollTop + paddingTop + lineHeight / 2;
};

const syncBoundaryData = (element: HTMLButtonElement, boundary: MusicRailBoundary) => {
    element.ariaLabel = markerLabels[boundary.markerKind];
    element.dataset.blockId = boundary.blockId;
    element.dataset.markerKind = boundary.markerKind;

    for (const attribute of [
        'endTone',
        'startMode',
        'startMusicId',
        'endMusicId',
        'musicPill',
        'musicId',
    ] as const) {
        delete element.dataset[attribute];
    }

    if (boundary.endTone) {
        element.dataset.endTone = boundary.endTone;
    }

    if (boundary.startMode) {
        element.dataset.startMode = boundary.startMode;
    }

    if (boundary.startMusicId) {
        element.dataset.startMusicId = boundary.startMusicId;
    }

    if (boundary.endMusicId) {
        element.dataset.endMusicId = boundary.endMusicId;
    }

    if (boundary.markerKind !== 'shared') {
        const musicId = boundary.startMusicId ?? boundary.endMusicId;

        if (musicId) {
            element.dataset.musicPill = 'rail';
            element.dataset.musicId = musicId;
        }
    }
};

export const createMusicRailMarkerController = (
    editor: TiptapEditor,
    canvas: HTMLElement,
    className: string,
) => {
    const elements = new Map<string, HTMLButtonElement>();

    const clear = () => {
        elements.forEach(element => element.remove());
        elements.clear();
    };
    const show = (boundaries: readonly MusicRailBoundary[]) => {
        const visibleBlockIds = new Set<string>();
        const left = resolveMusicRailLeft(canvas);

        boundaries.forEach(boundary => {
            if (boundary.markerKind === 'none') {
                return;
            }

            const top = resolveMusicRailBlockTop(editor, canvas, boundary.blockId);

            if (top === null) {
                return;
            }

            const element = elements.get(boundary.blockId) ?? document.createElement('button');

            visibleBlockIds.add(boundary.blockId);
            elements.set(boundary.blockId, element);
            element.type = 'button';
            element.className = className;
            element.dataset.musicRailBoundary = 'true';
            element.style.left = `${left}px`;
            element.style.top = `${top}px`;
            syncBoundaryData(element, boundary);

            if (!element.isConnected) {
                canvas.appendChild(element);
            }
        });

        elements.forEach((element, blockId) => {
            if (visibleBlockIds.has(blockId)) {
                return;
            }

            element.remove();
            elements.delete(blockId);
        });
    };

    return {clear, show};
};

export const createMusicRailRangeController = (
    canvas: HTMLElement,
    className: string,
) => {
    const elements = new Map<string, HTMLElement>();

    const clear = () => {
        elements.forEach(element => element.remove());
        elements.clear();
    };
    const show = (musicItems: readonly DerivedMusic[]) => {
        const visibleIds = new Set<string>();

        musicItems.forEach(music => {
            const geometry = resolveRangeGeometry(canvas, music);

            if (!geometry) {
                return;
            }

            const element = elements.get(music.musicId) ?? document.createElement('span');

            visibleIds.add(music.musicId);
            elements.set(music.musicId, element);
            element.className = className;
            element.dataset.musicRailRange = music.musicId;
            element.style.left = `${geometry.left}px`;
            element.style.top = `${geometry.top}px`;
            element.style.height = `${geometry.height}px`;

            if (!element.isConnected) {
                canvas.appendChild(element);
            }
        });

        elements.forEach((element, musicId) => {
            if (visibleIds.has(musicId)) {
                return;
            }

            element.remove();
            elements.delete(musicId);
        });
    };

    return {clear, show};
};

export const scrollToMusicRailBlock = (
    editor: TiptapEditor,
    blockId: string,
) => {
    const selector = `[data-id="${escapeMusicRailSelector(blockId)}"]`;

    editor.view.dom.querySelector<HTMLElement>(selector)?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
    });
};
