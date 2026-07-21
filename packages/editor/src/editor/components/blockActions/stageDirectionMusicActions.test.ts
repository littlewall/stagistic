import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    formatOpenMusicDisplayName,
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
});

const sceneBlock = (
    blockId: string,
    orderNo: number,
): ScriptBlockIndexSnapshot['blocks'][number] => ({
    ...block(blockId, orderNo, blockId),
    blockType: 'scene',
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
        };

        expect(resolveOpenMusicAtBlock(snapshot, 'target')?.musicId).toBe('second');
    });

    it('returns null after the latest music was explicitly closed', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                block('start', 0),
                block('out', 1),
                block('target', 2),
            ],
            music: [music('closed', 1, 'start', 'out')],
        };

        expect(resolveOpenMusicAtBlock(snapshot, 'target')).toBeNull();
    });

    it('returns null across a scene boundary', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [block('start', 0, 'scene-1'), block('target', 1, 'scene-2')],
            music: [music('previous-scene', 1, 'start')],
        };

        expect(resolveOpenMusicAtBlock(snapshot, 'target')).toBeNull();
    });
});

describe('resolveNewMusicNumber', () => {
    it('previews a single music with the scene number', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [sceneBlock('scene-1', 0), block('target', 1)],
            music: [],
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
        };

        expect(resolveNewMusicNumber(snapshot, 'target')).toBe('1.B)');
    });

    it('returns null for an unknown block', () => {
        expect(resolveNewMusicNumber({blocks: [], music: []}, 'missing')).toBeNull();
    });
});

describe('formatOpenMusicDisplayName', () => {
    it('includes the music number and title', () => {
        expect(formatOpenMusicDisplayName(music('music', 0, 'start'))).toBe('1.A) music');
    });

    it('truncates titles after ten characters', () => {
        expect(formatOpenMusicDisplayName({
            ...music('music', 0, 'start'),
            title: 'Long title name',
        })).toBe('1.A) Long title…');
    });

    it('uses only the music number when the title is empty', () => {
        expect(formatOpenMusicDisplayName({
            ...music('music', 0, 'start'),
            title: ' ',
        })).toBe('1.A)');
    });
});
