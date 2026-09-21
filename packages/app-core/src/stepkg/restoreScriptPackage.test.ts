import type {ScriptPackageWrite, ScriptRepository} from '@stagistic/db';
import {createEmptyScriptDocument} from '@stagistic/script';
import {createStepkg, type StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {restoreScriptPackage} from './restoreScriptPackage';

const snapshot: StepkgSnapshot = {
    script: {id: 'script-1', title: 'Original', subtitle: null, createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T11:00:00.000Z'},
    document: createEmptyScriptDocument(),
    titlePage: {},
    settings: {},
    characters: {characters: [], groups: [], genderOptions: []},
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [],
    attachmentBindings: [],
};

const exportBytes = async (): Promise<Uint8Array> => {
    const result = await createStepkg({
        snapshot,
        generator: {name: 'Stagistic', version: '0.0.0'},
        createdAt: new Date('2026-09-21T12:00:00.000Z'),
        loadAsset: () => Promise.resolve(null),
    });

    if (!result.ok) throw new Error('export failed');

    return new Uint8Array(await result.blob.arrayBuffer());
};

describe('restoreScriptPackage', () => {
    it("restores using the package's own script id, without remapping", async () => {
        let captured: ScriptPackageWrite | null = null;
        const repository = {
            restoreScriptFromPackage: (input: ScriptPackageWrite) => {
                captured = input;

                return Promise.resolve();
            },
        } as unknown as ScriptRepository;

        const result = await restoreScriptPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scriptId).toBe('script-1');
            expect(result.title).toBe('Original');
        }
        expect(captured).not.toBeNull();
        expect(captured!.script.id).toBe('script-1');
    });

    it('returns issues for a corrupt package and never calls the repository', async () => {
        let called = false;
        const repository = {
            restoreScriptFromPackage: () => {
                called = true;

                return Promise.resolve();
            },
        } as unknown as ScriptRepository;

        const result = await restoreScriptPackage({repository, bytes: new TextEncoder().encode('not a zip')});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
        expect(called).toBe(false);
    });

    it('surfaces write_failed when the repository write throws', async () => {
        const repository = {restoreScriptFromPackage: () => Promise.reject(new Error('db exploded'))} as unknown as ScriptRepository;

        const result = await restoreScriptPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues).toEqual([{code: 'write_failed', stage: 'write'}]);
    });
});
