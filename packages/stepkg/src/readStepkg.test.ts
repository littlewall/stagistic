import {createEmptyScriptDocument} from '@stagistic/script';
import {unzipSync, zipSync} from 'fflate';
import {describe, expect, it} from 'vite-plus/test';

const encoder = new TextEncoder();

import type {StepkgSnapshot} from './contracts';
import {createStepkg} from './createStepkg';
import {readStepkg} from './readStepkg';

const baseSnapshot = (): StepkgSnapshot => ({
    script: {id: 's1', title: 'Round trip', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: createEmptyScriptDocument(),
    titlePage: {},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    comments: {threads: [], messages: []},
    attachmentBindings: [],
});

const exportBytes = async (snapshot: StepkgSnapshot): Promise<Uint8Array> => {
    const result = await createStepkg({
        snapshot,
        generator: {name: 'Stagistic', version: '0.0.0'},
        createdAt: new Date('2026-09-18T12:00:00.000Z'),
        loadAsset: () => Promise.resolve(null),
    });

    if (!result.ok) throw new Error('export failed');

    return new Uint8Array(await result.blob.arrayBuffer());
};

const messageRow = (id: string, threadId: string) => ({
    id,
    threadId,
    authorId: 'local',
    body: 'b',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
    editedAt: null,
});
const threadRow = (id: string) => ({
    id,
    anchorKind: 'range' as const,
    anchorBlockId: null,
    quotedText: 'q',
    status: 'open' as const,
    resolvedAt: null,
    resolvedBy: null,
    createdBy: 'local',
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z',
});

describe('readStepkg', () => {
    it('round-trips comment threads and messages', async () => {
        const snapshot: StepkgSnapshot = {...baseSnapshot(), comments: {threads: [threadRow('t1')], messages: [messageRow('m1', 't1')]}};
        const result = await readStepkg(await exportBytes(snapshot));

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.package.snapshot.comments).toEqual(snapshot.comments);
    });

    it('reads a package without data/comments.json as having no comments', async () => {
        const entries = unzipSync(await exportBytes(baseSnapshot()));
        const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])) as {files: {path: string}[]};

        delete entries['data/comments.json'];
        manifest.files = manifest.files.filter(file => file.path !== 'data/comments.json');
        entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));

        const result = await readStepkg(zipSync(entries));

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.package.snapshot.comments).toEqual({threads: [], messages: []});
    });

    it('reports a comment message whose thread is missing', async () => {
        const entries = unzipSync(await exportBytes(baseSnapshot()));
        const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])) as {files: {path: string}[]};

        manifest.files = manifest.files.filter(file => file.path !== 'data/comments.json');
        entries['manifest.json'] = encoder.encode(JSON.stringify(manifest));
        entries['data/comments.json'] = encoder.encode(JSON.stringify({threads: [], messages: [messageRow('m1', 'missing')]}));

        const result = await readStepkg(zipSync(entries));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues).toContainEqual(expect.objectContaining({code: 'broken_reference', entity: {type: 'comment', id: 'm1'}}));
    });

    it('round-trips an exporter package into an equivalent snapshot', async () => {
        const snapshot: StepkgSnapshot = {
            ...baseSnapshot(),
            titlePage: {
                logo: {
                    dataUrl: 'data:image/png;base64,aGVsbG8=',
                    filename: 'logo.png',
                    mimeType: 'image/png',
                    widthPx: 400,
                    heightPx: 200,
                    sizeBytes: 5,
                },
            },
        };
        const result = await readStepkg(await exportBytes(snapshot));

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.package.snapshot.script.id).toBe('s1');
            expect(result.package.manifest.script.id).toBe('s1');
            expect(result.package.snapshot.titlePage.logo).toEqual(snapshot.titlePage.logo);
        }
    });

    it('reports checksum_mismatch when a file is tampered', async () => {
        const bytes = await exportBytes(baseSnapshot());
        const entries = unzipSync(bytes);
        entries['document.json'] = new TextEncoder().encode('{"tampered":true}');
        const result = await readStepkg(zipSync(entries));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues.some(issue => issue.code === 'checksum_mismatch')).toBe(true);
    });

    it('reports file_missing when a manifest-listed file is absent', async () => {
        const bytes = await exportBytes(baseSnapshot());
        const entries = unzipSync(bytes);
        delete entries['data/script.json'];
        const result = await readStepkg(zipSync(entries));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues.some(issue => issue.code === 'file_missing')).toBe(true);
    });

    it('reports broken_reference for an unresolved group member', async () => {
        // The exporter itself rejects a broken group reference (export design §12), so this package
        // is hand-built to reach the reader's own cross-reference check directly.
        const manifest = {
            format: 'stagistic-package',
            formatVersion: 1,
            documentSchemaVersion: 3,
            createdAt: '2026-09-18T12:00:00.000Z',
            generator: {name: 'Stagistic', version: '0.0.0'},
            script: {id: 's1', title: 'T', updatedAt: '2026-09-18T11:00:00.000Z'},
            entrypoints: {document: 'document.json', text: 'script.stagistic'},
            files: [],
        };
        const entries: Record<string, Uint8Array> = {
            'manifest.json': encoder.encode(JSON.stringify(manifest)),
            'document.json': encoder.encode(JSON.stringify(createEmptyScriptDocument())),
            'data/script.json': encoder.encode(JSON.stringify({id: 's1', title: 'T', subtitle: null, createdAt: 'x', updatedAt: 'x'})),
            'data/title-page.json': encoder.encode('{}'),
            'data/settings.json': encoder.encode('{}'),
            'data/characters.json': encoder.encode(
                JSON.stringify({
                    characters: [],
                    groups: [{id: 'g1', key: 'FAMILY', colorHex: null, memberIds: ['missing-char'], createdAt: 'x', updatedAt: 'x'}],
                    genderOptions: [],
                }),
            ),
            'data/music.json': encoder.encode(JSON.stringify({items: []})),
            'data/scenes.json': encoder.encode(JSON.stringify({scenes: [], locations: []})),
            'data/attachments.json': encoder.encode(JSON.stringify({items: [], bindings: []})),
        };
        const result = await readStepkg(zipSync(entries));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues.some(issue => issue.code === 'broken_reference')).toBe(true);
    });

    it('reports asset_missing when attachments.json references an asset the archive does not contain', async () => {
        // Hand-built package: manifest.files is empty (skips the checksum loop entirely), so this
        // exercises the assets stage in isolation from checksum/file_missing handling.
        const manifest = {
            format: 'stagistic-package',
            formatVersion: 1,
            documentSchemaVersion: 3,
            createdAt: '2026-09-18T12:00:00.000Z',
            generator: {name: 'Stagistic', version: '0.0.0'},
            script: {id: 's1', title: 'T', updatedAt: '2026-09-18T11:00:00.000Z'},
            entrypoints: {document: 'document.json', text: 'script.stagistic'},
            files: [],
        };
        const entries: Record<string, Uint8Array> = {
            'manifest.json': encoder.encode(JSON.stringify(manifest)),
            'document.json': encoder.encode(JSON.stringify(createEmptyScriptDocument())),
            'data/script.json': encoder.encode(JSON.stringify({id: 's1', title: 'T', subtitle: null, createdAt: 'x', updatedAt: 'x'})),
            'data/title-page.json': encoder.encode('{}'),
            'data/settings.json': encoder.encode('{}'),
            'data/characters.json': encoder.encode(JSON.stringify({characters: [], groups: [], genderOptions: []})),
            'data/music.json': encoder.encode(JSON.stringify({items: []})),
            'data/scenes.json': encoder.encode(JSON.stringify({scenes: [], locations: []})),
            'data/attachments.json': encoder.encode(
                JSON.stringify({
                    items: [
                        {
                            id: 'att-1',
                            filename: 'score.pdf',
                            mimeType: 'application/pdf',
                            sizeBytes: 3,
                            assetPath: 'assets/att-1/score.pdf',
                            createdAt: 'x',
                            updatedAt: 'x',
                        },
                    ],
                    bindings: [],
                }),
            ),
        };
        const result = await readStepkg(zipSync(entries));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues.some(issue => issue.code === 'asset_missing')).toBe(true);
    });
});
