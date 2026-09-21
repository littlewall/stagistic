import type {StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {mapStepkgSnapshotToPackageWrite} from './mapStepkgSnapshotToPackageWrite';

const snapshot: StepkgSnapshot = {
    script: {id: 's1', title: 'T', subtitle: 'sub', createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: {type: 'doc', content: []} as unknown as StepkgSnapshot['document'],
    titlePage: {source: 'Original'},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [
        {
            id: 'a1',
            filename: 'a.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T10:00:00.000Z',
            contentKey: 'assets/a1/a.pdf',
        },
    ],
    attachmentBindings: [{target: {type: 'music', id: 'm1'}, attachmentId: 'a1', role: 'integrated_score', order: 0, createdAt: '2026-09-18T10:00:00.000Z'}],
};

describe('mapStepkgSnapshotToPackageWrite', () => {
    it('converts timestamps and resolves attachment blobs', () => {
        const assets = new Map([['assets/a1/a.pdf', new Uint8Array([1, 2, 3])]]);
        const write = mapStepkgSnapshotToPackageWrite(snapshot, assets);

        expect(write.script.subtitle).toBe('sub');
        expect(write.script.updatedAt).toBe(new Date('2026-09-18T11:00:00.000Z').getTime());
        expect(write.attachments[0]?.blob.size).toBe(3);
        expect(write.bindings[0]).toMatchObject({musicId: 'm1', attachmentId: 'a1', sortOrder: 0});
    });
});
