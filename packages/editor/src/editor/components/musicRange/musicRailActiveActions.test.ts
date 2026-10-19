import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildMusicRailBoundaries} from './musicRangeModel';

const createSnapshot = (): ScriptBlockIndexSnapshot => ({
    blocks: [
        'before',
        'start',
        'inside',
        'end',
        'after',
    ].map((blockId, orderNo) => ({
        blockId,
        orderNo,
        blockType: 'stageDirection',
        textContent: '',
        actBlockId: null,
        sceneBlockId: 'scene-1',
        characterRefs: null,
    })),
    music: [
        {
            musicId: 'music',
            sceneNumber: 1,
            indexInScene: 0,
            sceneMusicCount: 1,
            mode: 'open',
            title: 'Overture',
            kind: null,
            startBlockId: 'start',
            endBlockId: 'end',
            effectiveEndBlockId: 'end',
            endKind: 'explicit',
        },
    ],
    orphanMusicOutBlockIds: [],
});

const boundariesFor = (snapshot: ScriptBlockIndexSnapshot, draftBlockId?: string) => {
    return buildMusicRailBoundaries(snapshot, snapshot.blocks.map(block => ({
        blockId: block.blockId,
        pos: block.orderNo,
        hasMusicStart: block.blockId === draftBlockId
            || snapshot.music.some(music => music.startBlockId === block.blockId),
        hasMusicOut: snapshot.music.some(music => music.endBlockId === block.blockId),
    })));
};

describe('active music rail actions', () => {
    it('offers no right menu on stage directions without music', () => {
        const snapshot = createSnapshot();

        snapshot.music = [];

        expect(boundariesFor(snapshot).every(boundary => !boundary.hasActions)).toBe(true);
    });

    it.each([
        'explicit',
        'scene-end',
        'next-music',
        'document-end',
    ] as const)(
        'offers an endpoint only inside the %s music range',
        endKind => {
            const snapshot = createSnapshot();

            snapshot.music[0].endKind = endKind;
            snapshot.music[0].endBlockId = endKind === 'explicit' ? 'end' : null;

            expect(boundariesFor(snapshot).filter(boundary => boundary.markerKind === 'none')
                .map(boundary => [boundary.blockId, boundary.hasActions])).toEqual([
                ['before', false],
                ['inside', true],
                ['after', false],
            ]);
        },
    );

    it('does not expose an endpoint on a draft music start', () => {
        const snapshot = createSnapshot();

        expect(boundariesFor(snapshot, 'inside').find(boundary => boundary.blockId === 'inside')?.hasActions).toBe(false);
    });

    it('does not expose an endpoint across a scene boundary', () => {
        const snapshot = createSnapshot();

        snapshot.blocks[2].sceneBlockId = 'scene-2';

        expect(boundariesFor(snapshot).find(boundary => boundary.blockId === 'inside')?.hasActions).toBe(false);
    });

    it.each(['act', 'scene'])('does not expose an endpoint on a %s block', blockType => {
        const snapshot = createSnapshot();

        snapshot.blocks[2].blockType = blockType;

        expect(boundariesFor(snapshot).find(boundary => boundary.blockId === 'inside')?.hasActions).toBe(false);
    });

    it('does not treat a hit as a music range', () => {
        const snapshot = createSnapshot();

        snapshot.music[0].mode = 'hit';
        snapshot.music[0].endKind = 'hit';
        snapshot.music[0].endBlockId = 'start';
        snapshot.music[0].effectiveEndBlockId = 'start';

        expect(boundariesFor(snapshot).find(boundary => boundary.blockId === 'inside')?.hasActions).toBe(false);
    });
});
