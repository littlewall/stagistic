import type {ScriptRepository, ScriptSummary} from '@stagistic/db';
import {createEmptyScriptDocument} from '@stagistic/script';
import {createStepkg, type StepkgSnapshot} from '@stagistic/stepkg';
import {describe, expect, it} from 'vite-plus/test';

import {peekStepkgPackage} from './peekStepkgPackage';

const snapshot: StepkgSnapshot = {
    script: {id: 'script-1', title: 'My Play', subtitle: null, createdAt: '2026-09-21T10:00:00.000Z', updatedAt: '2026-09-21T11:00:00.000Z'},
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

describe('peekStepkgPackage', () => {
    it('reports no collision when the script is not known locally', async () => {
        const repository = {getScriptSummary: () => Promise.resolve(null)} as unknown as ScriptRepository;
        const result = await peekStepkgPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.scriptId).toBe('script-1');
            expect(result.packageTitle).toBe('My Play');
            expect(result.existingScript).toBeNull();
        }
    });

    it('reports a collision with the local script title', async () => {
        const existing: ScriptSummary = {id: 'script-1', title: 'Local Copy', subtitle: null, createdAt: 1, updatedAt: 1};
        const repository = {getScriptSummary: () => Promise.resolve(existing)} as unknown as ScriptRepository;
        const result = await peekStepkgPackage({repository, bytes: await exportBytes()});

        expect(result.ok).toBe(true);
        if (result.ok) expect(result.existingScript).toEqual({id: 'script-1', title: 'Local Copy'});
    });

    it('returns issues for an invalid package without calling the repository', async () => {
        let called = false;
        const repository = {
            getScriptSummary: () => {
                called = true;

                return Promise.resolve(null);
            },
        } as unknown as ScriptRepository;

        const result = await peekStepkgPackage({repository, bytes: new TextEncoder().encode('not a zip')});

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.issues[0]?.code).toBe('not_a_zip');
        expect(called).toBe(false);
    });
});
