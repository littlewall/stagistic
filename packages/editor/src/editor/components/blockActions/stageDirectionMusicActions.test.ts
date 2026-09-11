import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    canResetMusicEnd,
    formatMusicTitlePreview,
    formatSetMusicOutLabel,
    resolveMusicBoundaryAvailabilityFromSnapshot,
    resolveNewMusicNumber,
    resolveOpenMusicAtBlock,
} from './stageDirectionMusicActions';

const block = (
    blockId: string,
    orderNo: number,
    sceneBlockId: string | null = 'scene-1',
): ScriptBlockIndexSnapshot['blocks'][number] => ({
    blockId,
    orderNo,
    blockType: 'stageDirection',
    textContent: '',
    actBlockId: null,
    sceneBlockId,
    characterRefs: null,
});

const music = (
    musicId: string,
    indexInScene: number,
    startBlockId: string,
    endBlockId: string | null = null,
): ScriptBlockIndexSnapshot['music'][number] => ({
    musicId,
    sceneNumber: 1,
    indexInScene,
    sceneMusicCount: 2,
    mode: 'open',
    title: musicId,
    kind: null,
    startBlockId,
    endBlockId,
    effectiveEndBlockId: endBlockId ?? startBlockId,
    endKind: endBlockId ? 'explicit' : 'document-end',
});

const sceneBlock = (
    blockId: string,
    orderNo: number,
): ScriptBlockIndexSnapshot['blocks'][number] => ({
    ...block(blockId, orderNo, blockId),
    blockType: 'scene',
});

describe('canResetMusicEnd', () => {
    const snapshotOf = (
        blocks: ScriptBlockIndexSnapshot['blocks'],
        musicItems: ScriptBlockIndexSnapshot['music'] = [],
    ): ScriptBlockIndexSnapshot => ({
        blocks,
        music: musicItems,
        orphanMusicOutBlockIds: [],
    });

    it('allows the reset while a plain block still follows', () => {
        const snapshot = snapshotOf([
            block('sd-1', 0),
            block('sd-2', 1),
            block('sd-3', 2),
        ]);

        expect(canResetMusicEnd(snapshot, 'sd-2')).toBe(true);
    });

    it('refuses on the last block of the script', () => {
        const snapshot = snapshotOf([block('sd-1', 0), block('sd-2', 1)]);

        expect(canResetMusicEnd(snapshot, 'sd-2')).toBe(false);
    });

    it('refuses when the scene ends right after', () => {
        const snapshot = snapshotOf([
            block('sd-1', 0),
            block('sd-2', 1),
            sceneBlock('scene-2', 2),
        ]);

        expect(canResetMusicEnd(snapshot, 'sd-2')).toBe(false);
    });

    it('refuses when the next block starts another music', () => {
        const snapshot = snapshotOf(
            [
                block('sd-1', 0),
                block('sd-2', 1),
                block('sd-3', 2),
            ],
            [music('next', 1, 'sd-3')],
        );

        expect(canResetMusicEnd(snapshot, 'sd-2')).toBe(false);
    });

    it('reads document order from orderNo, not from the array', () => {
        const snapshot = snapshotOf([
            block('sd-3', 2),
            block('sd-1', 0),
            block('sd-2', 1),
        ]);

        expect(canResetMusicEnd(snapshot, 'sd-2')).toBe(true);
        expect(canResetMusicEnd(snapshot, 'sd-3')).toBe(false);
    });
});

describe('resolveOpenMusicAtBlock', () => {
    it('returns the latest open music before the target block', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                block('start-1', 0),
                block('start-2', 1),
                block('target', 2),
            ],
            music: [music('first', 1, 'start-1'), music('second', 2, 'start-2')],
            orphanMusicOutBlockIds: [],
        };

        expect(resolveOpenMusicAtBlock(snapshot, 'target')?.musicId).toBe('second');
    });

    it('returns closed music so its explicit out can move', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                block('start', 0),
                block('out', 1),
                block('target', 2),
            ],
            music: [music('closed', 1, 'start', 'out')],
            orphanMusicOutBlockIds: [],
        };

        expect(resolveOpenMusicAtBlock(snapshot, 'target')?.musicId).toBe('closed');
    });

    it('returns null across a scene boundary', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [block('start', 0, 'scene-1'), block('target', 1, 'scene-2')],
            music: [music('previous-scene', 1, 'start')],
            orphanMusicOutBlockIds: [],
        };

        expect(resolveOpenMusicAtBlock(snapshot, 'target')).toBeNull();
    });
});

describe('resolveMusicBoundaryAvailabilityFromSnapshot', () => {
    it('resolves rail actions without reading the ProseMirror document', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [block('start', 0), block('target', 1)],
            music: [music('open', 0, 'start')],
            orphanMusicOutBlockIds: [],
        };

        expect(resolveMusicBoundaryAvailabilityFromSnapshot(snapshot, 'target', {
            hasMusicStart: false,
            hasMusicOut: false,
        })).toMatchObject({
            canAddMusic: true,
            outAction: 'add',
            outMusic: {musicId: 'open'},
        });
    });

    it('uses precomputed atom flags for drafts and orphan outs', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [block('target', 0)],
            music: [],
            orphanMusicOutBlockIds: ['target'],
        };

        expect(resolveMusicBoundaryAvailabilityFromSnapshot(snapshot, 'target', {
            hasMusicStart: true,
            hasMusicOut: true,
        })).toMatchObject({
            canAddMusic: false,
            outAction: 'remove',
            isOrphanOut: true,
        });
    });
});

describe('resolveNewMusicNumber', () => {
    it('previews a single music with the scene number', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [sceneBlock('scene-1', 0), block('target', 1)],
            music: [],
            orphanMusicOutBlockIds: [],
        };

        expect(resolveNewMusicNumber(snapshot, 'target')).toBe('1)');
    });

    it('previews the music letter at its insertion position', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                sceneBlock('scene-1', 0),
                block('first', 1),
                block('target', 2),
                block('last', 3),
            ],
            music: [music('first-music', 0, 'first'), music('last-music', 1, 'last')],
            orphanMusicOutBlockIds: [],
        };

        expect(resolveNewMusicNumber(snapshot, 'target')).toBe('1.B)');
    });

    it('returns null for an unknown block', () => {
        expect(resolveNewMusicNumber({
            blocks: [], music: [], orphanMusicOutBlockIds: [],
        }, 'missing')).toBeNull();
    });
});

describe('formatSetMusicOutLabel', () => {
    it('wraps the music number in parentheses', () => {
        expect(formatSetMusicOutLabel(music('music', 0, 'start'))).toBe('Set music end (1.A)');
    });
});

describe('formatMusicTitlePreview', () => {
    it('carries the title alone, since the command label owns the number', () => {
        expect(formatMusicTitlePreview(music('music', 0, 'start'))).toBe('music');
    });

    it('truncates titles after ten characters', () => {
        expect(formatMusicTitlePreview({
            ...music('music', 0, 'start'),
            title: 'Long title name',
        })).toBe('Long title…');
    });

    it('has nothing to show for an empty title', () => {
        expect(formatMusicTitlePreview({
            ...music('music', 0, 'start'),
            title: ' ',
        })).toBeUndefined();
    });
});
