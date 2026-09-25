import type {ScriptPackageSource, ScriptRepository} from '@stagistic/db';
import {describe, expect, it} from 'vite-plus/test';

import {exportScriptPackage} from './exportScriptPackage';

const source = {
    script: {id: 'script-1', title: 'Test', subtitle: null, createdAt: 1_726_657_200_000, updatedAt: 1_726_657_200_000},
    document: {type: 'doc', content: []},
    titlePage: {},
    settings: {},
    characters: [],
    characterGroupMembers: [],
    characterGenders: [],
    music: [],
    locations: [],
    scenes: [],
    sceneLocations: [],
    attachments: [],
    musicAttachmentBindings: [],
    comments: {threads: [], messages: []},
} as ScriptPackageSource;

describe('exportScriptPackage', () => {
    it('flushes before reading the package source and creates a stepkg archive', async () => {
        const events: string[] = [];
        const repository = {
            getScriptPackageSource: () => {
                events.push('snapshot');
                return Promise.resolve(source);
            },
            getAttachmentBlob: () => Promise.resolve(null),
        } as unknown as ScriptRepository;
        const result = await exportScriptPackage({
            repository,
            scriptId: 'script-1',
            flush: () => {
                events.push('flush');
                return Promise.resolve();
            },
            generator: {name: 'Stagistic', version: 'test'},
        });

        expect(events).toEqual(['flush', 'snapshot']);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.fileName).toBe('Test.stepkg');
    });

    it('makes flush failures safe for later UI presentation', async () => {
        const repository = {} as ScriptRepository;
        await expect(
            exportScriptPackage({
                repository,
                scriptId: 'script-1',
                flush: () => Promise.reject(new Error('save failed')),
                generator: {name: 'Stagistic', version: 'test'},
            }),
        ).resolves.toEqual({ok: false, issues: [{code: 'editor_flush_failed', stage: 'flush'}]});
    });
});
