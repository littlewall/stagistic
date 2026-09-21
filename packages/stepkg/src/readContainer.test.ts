import {zipSync} from 'fflate';
import {describe, expect, it} from 'vite-plus/test';

import {readStepkgContainer} from './readContainer';

const encoder = new TextEncoder();

const zipWith = (entries: Record<string, string>): Uint8Array =>
    zipSync(Object.fromEntries(Object.entries(entries).map(([path, value]) => [path, encoder.encode(value)])));

interface ManifestFixture {
    format: string;
    formatVersion: number;
    documentSchemaVersion: number;
    createdAt: string;
    generator: {name: string; version: string};
    script: {id: string; title: string; updatedAt: string};
    entrypoints: {document: string; text: string};
    files: unknown[];
}

const manifestFixture = (): ManifestFixture => ({
    format: 'stagistic-package',
    formatVersion: 1,
    documentSchemaVersion: 3,
    createdAt: '2026-09-18T12:00:00.000Z',
    generator: {name: 'Stagistic', version: '0.0.0'},
    script: {id: 's1', title: 'T', updatedAt: '2026-09-18T11:00:00.000Z'},
    entrypoints: {document: 'document.json', text: 'script.stagistic'},
    files: [],
});

const validManifest = () => JSON.stringify(manifestFixture());

describe('readStepkgContainer', () => {
    it('rejects non-ZIP bytes with not_a_zip', async () => {
        const result = await readStepkgContainer(encoder.encode('not a zip'));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
    });

    it('rejects a missing manifest with manifest_invalid', async () => {
        const result = await readStepkgContainer(zipWith({'document.json': '{}'}));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('manifest_invalid');
    });

    it('rejects an unsupported formatVersion', async () => {
        const manifest = manifestFixture();
        manifest.formatVersion = 2;
        const result = await readStepkgContainer(zipWith({'manifest.json': JSON.stringify(manifest)}));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('unsupported_format_version');
    });

    it('rejects a too-new documentSchemaVersion', async () => {
        const manifest = manifestFixture();
        manifest.documentSchemaVersion = 999;
        const result = await readStepkgContainer(zipWith({'manifest.json': JSON.stringify(manifest)}));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('unsupported_document_schema_version');
    });

    it('returns the manifest and file map for a valid container', async () => {
        const result = await readStepkgContainer(zipWith({'manifest.json': validManifest(), 'document.json': '{}'}));

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.manifest.script.id).toBe('s1');
            expect(result.files.has('document.json')).toBe(true);
        }
    });
});
