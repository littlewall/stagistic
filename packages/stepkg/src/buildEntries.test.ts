import {describe, expect, it} from 'vite-plus/test';

import {buildStepkgEntries} from './buildEntries';
import type {StepkgSnapshot} from './contracts';

const snapshot: StepkgSnapshot = {
    script: {id: 'script-1', title: 'Test', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: {type: 'doc', content: []},
    titlePage: {},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [
        {
            id: 'att-1',
            filename: 'score.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            contentKey: 'blob-1',
            createdAt: '2026-09-18T10:00:00.000Z',
            updatedAt: '2026-09-18T10:00:00.000Z',
        },
    ],
    attachmentBindings: [],
};

describe('buildStepkgEntries', () => {
    it('adds an asset and a manifest that identifies its source script', async () => {
        const result = await buildStepkgEntries({
            snapshot,
            generator: {name: 'Stagistic', version: 'test'},
            createdAt: new Date('2026-09-18T12:00:00.000Z'),
            loadAsset: key => Promise.resolve(key === 'blob-1' ? new Blob(['pdf'], {type: 'application/pdf'}) : null),
        });

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.manifest.script.id).toBe(snapshot.script.id);
            expect(result.manifest.files.some(file => file.path === 'assets/att-1/score.pdf')).toBe(true);
            expect(result.entries.at(-1)?.path).toBe('manifest.json');
            expect(result.manifest.files.some(file => file.path === 'manifest.json')).toBe(false);
        }
    });

    it('aggregates missing assets and serializer failures', async () => {
        const missing = await buildStepkgEntries({
            ...baseArgs(),
            snapshot: {...snapshot, attachments: [snapshot.attachments[0], {...snapshot.attachments[0], id: 'att-2', contentKey: 'blob-2'}]},
            loadAsset: () => Promise.resolve(null),
        });
        expect(missing.ok).toBe(false);
        if (!missing.ok) expect(missing.issues.map(issue => issue.code)).toEqual(['asset_blob_missing', 'asset_blob_missing']);

        await expect(
            buildStepkgEntries({
                ...baseArgs(),
                serializeContent: () => {
                    throw new Error('bad document');
                },
            }),
        ).resolves.toEqual({ok: false, issues: [{code: 'serialization_failed', stage: 'serialization'}]});
    });
});

const baseArgs = () => ({
    snapshot,
    generator: {name: 'Stagistic', version: 'test'},
    createdAt: new Date('2026-09-18T12:00:00.000Z'),
    loadAsset: () => Promise.resolve(new Blob(['pdf'], {type: 'application/pdf'})),
});
