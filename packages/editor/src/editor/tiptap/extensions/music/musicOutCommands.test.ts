import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {resolveMusicOutCandidate} from './musicOutCommands';

const block = (
    blockId: string,
    orderNo: number,
    sceneBlockId = 'scene-1',
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
    startBlockId: string,
    endBlockId: string | null = null,
): ScriptBlockIndexSnapshot['music'][number] => ({
    musicId,
    sceneNumber: 1,
    indexInScene: 0,
    sceneMusicCount: 1,
    mode: 'open',
    title: musicId,
    kind: null,
    startBlockId,
    endBlockId,
    effectiveEndBlockId: endBlockId ?? startBlockId,
    endKind: endBlockId ? 'explicit' : 'document-end',
});

const snapshot = (
    blocks: ScriptBlockIndexSnapshot['blocks'],
    musicEntries: ScriptBlockIndexSnapshot['music'],
): ScriptBlockIndexSnapshot => ({
    blocks,
    music: musicEntries,
    orphanMusicOutBlockIds: [],
});

describe('resolveMusicOutCandidate', () => {
    it('finds the latest durational start strictly before the target', () => {
        const value = snapshot(
            [
                block('a', 0),
                block('hit', 1),
                block('b', 2),
                block('target', 3),
            ],
            [
                music('a', 'a'),
                {
                    ...music('hit', 'hit'), mode: 'hit', endBlockId: 'hit', endKind: 'hit',
                },
                music('b', 'b'),
            ],
        );

        expect(resolveMusicOutCandidate(value, 'target')?.musicId).toBe('b');
    });

    it('excludes a start on the target block so out precedes start', () => {
        const value = snapshot(
            [block('a', 0), block('target', 1)],
            [music('a', 'a'), music('target', 'target')],
        );

        expect(resolveMusicOutCandidate(value, 'target')?.musicId).toBe('a');
    });

    it('can move an existing explicit out later before the next start', () => {
        const value = snapshot(
            [
                block('start', 0),
                block('out', 1),
                block('target', 2),
            ],
            [music('song', 'start', 'out')],
        );

        expect(resolveMusicOutCandidate(value, 'target')).toMatchObject({
            musicId: 'song', endBlockId: 'out',
        });
    });

    it('does not cross a scene boundary', () => {
        const value = snapshot(
            [block('start', 0, 'scene-1'), block('target', 1, 'scene-2')],
            [music('song', 'start')],
        );

        expect(resolveMusicOutCandidate(value, 'target')).toBeNull();
    });
});
