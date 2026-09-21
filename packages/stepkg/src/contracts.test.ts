import {describe, expect, it} from 'vite-plus/test';

import {STEPKG_EXTENSION, STEPKG_FORMAT, STEPKG_FORMAT_VERSION, STEPKG_MEDIA_TYPE, type StepkgManifest} from './index';

describe('stepkg contract', () => {
    it('pins the version-one discriminator and browser file identity', () => {
        expect(STEPKG_FORMAT).toBe('stagistic-package');
        expect(STEPKG_FORMAT_VERSION).toBe(1);
        expect(STEPKG_EXTENSION).toBe('.stepkg');
        expect(STEPKG_MEDIA_TYPE).toBe('application/vnd.stagistic.package+zip');
    });

    it('requires source script identity in the manifest', () => {
        const manifest: StepkgManifest = {
            format: STEPKG_FORMAT,
            formatVersion: STEPKG_FORMAT_VERSION,
            documentSchemaVersion: 3,
            createdAt: '2026-09-18T12:00:00.000Z',
            generator: {name: 'Stagistic', version: 'test'},
            script: {
                id: 'script-1',
                title: 'Test',
                updatedAt: '2026-09-18T11:00:00.000Z',
            },
            entrypoints: {document: 'document.json', text: 'script.stagistic'},
            files: [],
        };

        expect(manifest.script.id).toBe('script-1');
    });
});
