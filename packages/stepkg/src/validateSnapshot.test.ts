import {describe, expect, it} from 'vite-plus/test';

import type {StepkgSnapshot} from './contracts';
import {validateStepkgSnapshot} from './validateSnapshot';

const snapshot: StepkgSnapshot = {
    script: {id: 'script-1', title: 'Test', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: {type: 'doc', content: [{type: 'scene', attrs: {id: 'block-1'}, content: []}]},
    titlePage: {},
    settings: {},
    characters: {
        characters: [
            {
                id: 'character-1',
                key: 'ANNA',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: '2026-09-18T10:00:00.000Z',
                updatedAt: '2026-09-18T10:00:00.000Z',
            },
            {
                id: 'character-1',
                key: 'BERTA',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: '2026-09-18T10:00:00.000Z',
                updatedAt: '2026-09-18T10:00:00.000Z',
            },
        ],
        groups: [
            {
                id: 'group-1',
                key: 'GROUP',
                colorHex: null,
                memberIds: ['missing-character'],
                createdAt: '2026-09-18T10:00:00.000Z',
                updatedAt: '2026-09-18T10:00:00.000Z',
            },
        ],
        genderOptions: [],
    },
    music: {
        items: [
            {
                id: 'music-1',
                sceneNumber: 1,
                indexInScene: 1,
                mode: 'hit',
                title: 'Song',
                kind: null,
                startBlockId: 'missing-block',
                endBlockId: null,
                createdAt: '2026-09-18T10:00:00.000Z',
                updatedAt: '2026-09-18T10:00:00.000Z',
            },
        ],
    },
    scenes: {
        scenes: [
            {
                id: 'scene-1',
                headingBlockId: 'missing-heading',
                sceneNumber: null,
                colorHex: null,
                synopsis: null,
                locationIds: [],
                createdAt: '2026-09-18T10:00:00.000Z',
                updatedAt: '2026-09-18T10:00:00.000Z',
            },
        ],
        locations: [],
    },
    attachments: [
        {
            id: 'attachment-1',
            filename: 'score.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1,
            contentKey: 'key-1',
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T10:00:00.000Z',
        },
        {
            id: 'attachment-2',
            filename: 'score.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1,
            contentKey: 'key-2',
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T10:00:00.000Z',
        },
    ],
    attachmentBindings: [
        {target: {type: 'music', id: 'music-1'}, attachmentId: 'missing-attachment', role: 'score', order: 0, createdAt: '2026-09-18T10:00:00.000Z'},
    ],
};

describe('validateStepkgSnapshot', () => {
    it('returns all deterministic relationship diagnostics', () => {
        expect(validateStepkgSnapshot(snapshot).map(issue => [issue.code, issue.entity?.type, issue.entity?.id])).toEqual([
            ['duplicate_id', 'character', 'character-1'],
            ['broken_reference', 'character', 'group-1'],
            ['broken_reference', 'scene', 'scene-1'],
            ['broken_reference', 'music', 'music-1'],
            ['broken_reference', 'attachment', 'missing-attachment'],
        ]);
    });
});
