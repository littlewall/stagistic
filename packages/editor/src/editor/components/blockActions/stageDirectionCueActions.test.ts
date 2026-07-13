import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    formatOpenCueDisplayName,
    resolveNewCueNumber,
    resolveOpenCueAtBlock,
} from './stageDirectionCueActions';

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

const cue = (
    cueId: string,
    indexInScene: number,
    startBlockId: string,
    endBlockId: string | null = null,
): ScriptBlockIndexSnapshot['cues'][number] => ({
    cueId,
    sceneNumber: 1,
    indexInScene,
    sceneCueCount: 2,
    mode: 'open',
    title: cueId,
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

describe('resolveOpenCueAtBlock', () => {
    it('returns the latest open cue before the target block', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                block('start-1', 0),
                block('start-2', 1),
                block('target', 2),
            ],
            cues: [cue('first', 1, 'start-1'), cue('second', 2, 'start-2')],
        };

        expect(resolveOpenCueAtBlock(snapshot, 'target')?.cueId).toBe('second');
    });

    it('returns null after the latest cue was explicitly closed', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                block('start', 0),
                block('out', 1),
                block('target', 2),
            ],
            cues: [cue('closed', 1, 'start', 'out')],
        };

        expect(resolveOpenCueAtBlock(snapshot, 'target')).toBeNull();
    });

    it('returns null across a scene boundary', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [block('start', 0, 'scene-1'), block('target', 1, 'scene-2')],
            cues: [cue('previous-scene', 1, 'start')],
        };

        expect(resolveOpenCueAtBlock(snapshot, 'target')).toBeNull();
    });
});

describe('resolveNewCueNumber', () => {
    it('previews a single cue with the scene number', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [sceneBlock('scene-1', 0), block('target', 1)],
            cues: [],
        };

        expect(resolveNewCueNumber(snapshot, 'target')).toBe('1)');
    });

    it('previews the cue letter at its insertion position', () => {
        const snapshot: ScriptBlockIndexSnapshot = {
            blocks: [
                sceneBlock('scene-1', 0),
                block('first', 1),
                block('target', 2),
                block('last', 3),
            ],
            cues: [cue('first-cue', 0, 'first'), cue('last-cue', 1, 'last')],
        };

        expect(resolveNewCueNumber(snapshot, 'target')).toBe('1.B)');
    });

    it('returns null for an unknown block', () => {
        expect(resolveNewCueNumber({blocks: [], cues: []}, 'missing')).toBeNull();
    });
});

describe('formatOpenCueDisplayName', () => {
    it('includes the cue number and title', () => {
        expect(formatOpenCueDisplayName(cue('cue', 0, 'start'))).toBe('1.A) cue');
    });

    it('truncates titles after ten characters', () => {
        expect(formatOpenCueDisplayName({
            ...cue('cue', 0, 'start'),
            title: 'Long title name',
        })).toBe('1.A) Long title…');
    });

    it('uses only the cue number when the title is empty', () => {
        expect(formatOpenCueDisplayName({
            ...cue('cue', 0, 'start'),
            title: ' ',
        })).toBe('1.A)');
    });
});
