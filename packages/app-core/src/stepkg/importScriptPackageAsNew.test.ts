import type {ScriptPackageWrite, ScriptRepository} from '@stagistic/db';
import {createEmptyScriptDocument} from '@stagistic/script';
import {createStepkg, type StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {importScriptPackageAsNew} from './importScriptPackageAsNew';

const baseSnapshot = (): StepkgSnapshot => ({
    script: {id: 'original-id', title: 'Original', subtitle: null, createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T11:00:00.000Z'},
    document: createEmptyScriptDocument(),
    titlePage: {source: 'Original'},
    settings: {},
    characters: {
        characters: [
            {
                id: 'char-1',
                key: 'MARA',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: 'x',
                updatedAt: 'x',
            },
        ],
        groups: [],
        genderOptions: [],
    },
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    attachmentBindings: [],
    comments: {threads: [], messages: []},
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

describe('importScriptPackageAsNew', () => {
    it('imports an exported package as an independent new script', async () => {
        const bytes = await exportBytes(baseSnapshot());
        let captured: ScriptPackageWrite | null = null;
        const repository = {
            createScriptFromPackage: (input: ScriptPackageWrite) => {
                captured = input;
                return Promise.resolve();
            },
        } as unknown as ScriptRepository;

        const result = await importScriptPackageAsNew({repository, bytes});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scriptId).not.toBe('original-id');
            expect(result.title).toBe('Original');
        }
        expect(captured).not.toBeNull();
        expect(captured!.script.id).not.toBe('original-id');
        expect(captured!.characters[0]?.id).not.toBe('char-1');
        expect(captured!.document.content?.length).toBe(baseSnapshot().document.content?.length);
    });

    it('applies a title override, falling back to the package title when blank', async () => {
        const bytes = await exportBytes(baseSnapshot());
        const repository = {createScriptFromPackage: () => Promise.resolve()} as unknown as ScriptRepository;

        const overridden = await importScriptPackageAsNew({repository, bytes, title: 'My Copy'});
        expect(overridden.ok).toBe(true);
        if (overridden.ok) expect(overridden.title).toBe('My Copy');

        const fallback = await importScriptPackageAsNew({repository, bytes, title: '   '});
        expect(fallback.ok).toBe(true);
        if (fallback.ok) expect(fallback.title).toBe('Original');
    });

    it('returns issues for a corrupt package and never calls the repository', async () => {
        let called = false;
        const repository = {
            createScriptFromPackage: () => {
                called = true;
                return Promise.resolve();
            },
        } as unknown as ScriptRepository;

        const result = await importScriptPackageAsNew({repository, bytes: new TextEncoder().encode('not a zip')});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
        expect(called).toBe(false);
    });

    it('surfaces write_failed when the repository write throws', async () => {
        const bytes = await exportBytes(baseSnapshot());
        const repository = {createScriptFromPackage: () => Promise.reject(new Error('db exploded'))} as unknown as ScriptRepository;

        const result = await importScriptPackageAsNew({repository, bytes});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues).toEqual([{code: 'write_failed', stage: 'write'}]);
    });
});
