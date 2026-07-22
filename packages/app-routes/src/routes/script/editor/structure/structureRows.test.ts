import {
    describe, expect, it,
} from 'vite-plus/test';

import {deriveStructureStateFromIndex} from './structureRows';

describe('scene numbering', () => {
    it('numbers scenes globally across acts', () => {
        const state = deriveStructureStateFromIndex({
            blocks: [
                {
                    blockId: 'a1', blockType: 'act', textContent: 'ACT I', orderNo: 0, actBlockId: 'a1', sceneBlockId: null, characterRefs: null,
                },
                {
                    blockId: 's1', blockType: 'scene', textContent: 'Dawn', orderNo: 1, actBlockId: 'a1', sceneBlockId: 's1', characterRefs: null,
                },
                {
                    blockId: 'a2', blockType: 'act', textContent: 'ACT II', orderNo: 2, actBlockId: 'a2', sceneBlockId: null, characterRefs: null,
                },
                {
                    blockId: 's2', blockType: 'scene', textContent: 'Dusk', orderNo: 3, actBlockId: 'a2', sceneBlockId: 's2', characterRefs: null,
                },
            ],
            music: [],
            orphanMusicOutBlockIds: [],
        });

        const scenes = state.groups.flatMap(group => group.scenes);

        expect(scenes.map(scene => [scene.sceneNumber, scene.title])).toEqual([[1, 'Dawn'], [2, 'Dusk']]);
    });
});
