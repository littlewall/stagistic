import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {resolveOpenCueAtBlock} from './stageDirectionCueActions';

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
    number: number,
    startBlockId: string,
    endBlockId: string | null = null,
): ScriptBlockIndexSnapshot['cues'][number] => ({
    cueId,
    number,
    mode: 'open',
    title: cueId,
    kind: null,
    startBlockId,
    endBlockId,
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
