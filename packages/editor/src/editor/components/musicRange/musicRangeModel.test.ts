import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    buildMusicRailBoundaries,
    canDropMusicOutAtBoundary,
} from './musicRangeModel';

const snapshot = (): ScriptBlockIndexSnapshot => ({
    blocks: [
        {
            blockId: 'block-1',
            orderNo: 0,
            blockType: 'stageDirection',
            textContent: 'Before',
            actBlockId: null,
            sceneBlockId: 'scene-1',
            characterRefs: null,
        },
    ],
    music: [],
    orphanMusicOutBlockIds: [],
});

describe('buildMusicRailBoundaries', () => {
    it('combines an implicit end and the next start at one boundary', () => {
        const index = snapshot();

        index.blocks.push({
            ...index.blocks[0],
            blockId: 'block-2',
            orderNo: 1,
        });
        index.music = [
            {
                musicId: 'first',
                sceneNumber: 1,
                indexInScene: 0,
                sceneMusicCount: 2,
                mode: 'open',
                title: 'First',
                kind: null,
                startBlockId: 'block-1',
                endBlockId: null,
                effectiveEndBlockId: 'block-2',
                endKind: 'next-music',
            }, {
                musicId: 'second',
                sceneNumber: 1,
                indexInScene: 1,
                sceneMusicCount: 2,
                mode: 'open',
                title: 'Second',
                kind: null,
                startBlockId: 'block-2',
                endBlockId: null,
                effectiveEndBlockId: 'block-2',
                endKind: 'document-end',
            },
        ];

        const boundaries = buildMusicRailBoundaries(index, [
            {
                blockId: 'block-1', pos: 10, hasMusicStart: true, hasMusicOut: false,
            }, {
                blockId: 'block-2', pos: 20, hasMusicStart: true, hasMusicOut: false,
            },
        ]);

        expect(boundaries[1]).toMatchObject({
            markerKind: 'shared',
            endTone: 'implicit',
            endMusicId: 'first',
            startMusicId: 'second',
        });
    });

    it('represents hits and orphan outs without a duration', () => {
        const index = snapshot();

        index.blocks.push({
            ...index.blocks[0],
            blockId: 'block-2',
            orderNo: 1,
        });
        index.music = [
            {
                musicId: 'hit',
                sceneNumber: 1,
                indexInScene: 0,
                sceneMusicCount: 1,
                mode: 'hit',
                title: 'Hit',
                kind: null,
                startBlockId: 'block-1',
                endBlockId: 'block-1',
                effectiveEndBlockId: 'block-1',
                endKind: 'hit',
            },
        ];
        index.orphanMusicOutBlockIds = ['block-2'];

        const boundaries = buildMusicRailBoundaries(index, [
            {
                blockId: 'block-1', pos: 10, hasMusicStart: true, hasMusicOut: false,
            }, {
                blockId: 'block-2', pos: 20, hasMusicStart: false, hasMusicOut: true,
            },
        ]);

        expect(boundaries.map(boundary => boundary.markerKind)).toEqual(['hit', 'orphan']);
    });
});

describe('canDropMusicOutAtBoundary', () => {
    it.each(['act', 'scene'])('rejects a %s block as an endpoint', blockType => {
        const index = snapshot();

        index.blocks = [
            {
                ...index.blocks[0],
                blockId: 'start',
                orderNo: 0,
            }, {
                ...index.blocks[0],
                blockId: 'target',
                orderNo: 1,
                blockType,
            },
        ];
        index.music = [
            {
                musicId: 'song',
                sceneNumber: 1,
                indexInScene: 0,
                sceneMusicCount: 1,
                mode: 'open',
                title: 'Song',
                kind: null,
                startBlockId: 'start',
                endBlockId: null,
                effectiveEndBlockId: 'target',
                endKind: 'scene-end',
            },
        ];

        expect(canDropMusicOutAtBoundary(index, 'song', 'target')).toBe(false);
    });

    it('allows hits but clamps the drop at the next durational start', () => {
        const index = snapshot();

        index.blocks = [
            'start',
            'hit',
            'next',
            'after',
        ].map((blockId, orderNo) => ({
            ...index.blocks[0], blockId, orderNo,
        }));
        index.music = [
            {
                musicId: 'first',
                sceneNumber: 1,
                indexInScene: 0,
                sceneMusicCount: 3,
                mode: 'open',
                title: 'First',
                kind: null,
                startBlockId: 'start',
                endBlockId: null,
                effectiveEndBlockId: 'next',
                endKind: 'next-music',
            },
            {
                musicId: 'hit',
                sceneNumber: 1,
                indexInScene: 1,
                sceneMusicCount: 3,
                mode: 'hit',
                title: 'Hit',
                kind: null,
                startBlockId: 'hit',
                endBlockId: 'hit',
                effectiveEndBlockId: 'hit',
                endKind: 'hit',
            },
            {
                musicId: 'second',
                sceneNumber: 1,
                indexInScene: 2,
                sceneMusicCount: 3,
                mode: 'open',
                title: 'Second',
                kind: null,
                startBlockId: 'next',
                endBlockId: null,
                effectiveEndBlockId: 'after',
                endKind: 'document-end',
            },
        ];

        expect(canDropMusicOutAtBoundary(index, 'first', 'hit')).toBe(true);
        expect(canDropMusicOutAtBoundary(index, 'first', 'next')).toBe(true);
        expect(canDropMusicOutAtBoundary(index, 'first', 'after')).toBe(false);
    });
});
