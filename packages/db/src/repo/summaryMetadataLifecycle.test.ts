import {
    buildScriptSummaryMetadata,
    type ScriptDocument,
} from '@stagistic/script';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../storage/fileStorage';
import {createTestDb} from '../testing/createTestDb';
import type {ScriptPackageWrite} from '../types/scriptPackageWrite';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

const clients: Awaited<ReturnType<typeof createTestDb>>['client'][] = [];
const document = (...types: string[]): ScriptDocument => ({
    type: 'doc',
    content: types.map((type, index) => ({
        type,
        attrs: {id: `block-${index}`},
        content: [],
    })),
});
const setup = async () => {
    const {db, client} = await createTestDb();

    clients.push(client);

    return createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });
};

afterEach(async () => {
    await Promise.all(clients.splice(0).map(client => client.close()));
});

describe('script summary metadata lifecycle', () => {
    it('creates structure metadata with unknown pages for empty and initial documents', async () => {
        const repository = await setup();
        const initial = document('scene', 'act', 'scene', 'act');
        const emptyId = await repository.createScript('Empty');
        const scriptId = await repository.createScript('Initial', initial);

        expect((await repository.getScriptSummary(emptyId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(document()));
        expect((await repository.getScriptSummary(scriptId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(initial));
    });

    it('duplicates structure and copies measured pages only when layout settings are copied', async () => {
        const repository = await setup();
        const value = document('act', 'scene', 'scene', 'act');
        const scriptId = await repository.createScript('Original', value);

        await repository.saveScriptSettings(scriptId, {page: {widthPx: 720}});
        await repository.saveLatest(scriptId, value, buildScriptSummaryMetadata(value, 4));

        const copiedId = await repository.duplicateScript(scriptId, {
            title: 'Copied',
            copySettings: true,
            copyAttributes: true,
        });
        const resetId = await repository.duplicateScript(scriptId, {
            title: 'Reset',
            copySettings: false,
            copyAttributes: false,
        });

        expect((await repository.getScriptSummary(copiedId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(value, 4));
        expect((await repository.getScriptSummary(resetId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(value));
    });

    it('derives fresh structure and unknown pages on package import and restore', async () => {
        const repository = await setup();
        const first = document('scene', 'act', 'scene');
        const input: ScriptPackageWrite = {
            script: {
                id: 'imported',
                title: 'Imported',
                subtitle: null,
                createdAt: 1,
                updatedAt: 1,
            },
            document: first,
            settings: {},
            titlePage: {},
            characters: [],
            groups: [],
            genders: [],
            music: [],
            locations: [],
            scenes: [],
            attachments: [],
            bindings: [],
            comments: {threads: [], messages: []},
        };

        await repository.createScriptFromPackage(input);
        expect((await repository.getScriptSummary('imported'))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(first));
        await repository.saveLatest('imported', first, buildScriptSummaryMetadata(first, 3));

        const next = document('act', 'scene', 'scene', 'act');

        await repository.restoreScriptFromPackage({...input, document: next});
        expect((await repository.getScriptSummary('imported'))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(next));
    });

    it('invalidates pages when layout settings change or are deleted', async () => {
        const repository = await setup();
        const value = document('act', 'scene');
        const scriptId = await repository.createScript('Layout', value);

        await repository.saveLatest(scriptId, value, buildScriptSummaryMetadata(value, 3));
        await repository.saveScriptSettings(scriptId, {page: {heightPx: 800}});
        expect((await repository.getScriptSummary(scriptId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(value));
        await repository.saveSummaryMetadata(scriptId, value, buildScriptSummaryMetadata(value, 4));
        await repository.deleteScriptSettings(scriptId);
        expect((await repository.getScriptSummary(scriptId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(value));
    });

    it('preserves measured pages when only character decoration changes', async () => {
        const repository = await setup();
        const value = document('scene');
        const scriptId = await repository.createScript('Visual', value);

        await repository.saveLatest(scriptId, value, buildScriptSummaryMetadata(value, 2));
        await repository.saveScriptSettings(scriptId, {visual: {characterDecoration: 'none'}});

        expect((await repository.getScriptSummary(scriptId))?.summaryMetadata?.pageCount).toBe(2);
    });

    it('rejects an old-layout refresh after the same document is measured under new settings', async () => {
        const repository = await setup();
        const value = document('scene');
        const scriptId = await repository.createScript('Layout race', value);
        const oldSettings = {page: {heightPx: 800}};
        const newSettings = {page: {heightPx: 1600}};

        await repository.saveScriptSettings(scriptId, oldSettings);
        await repository.saveLatest(scriptId, value, buildScriptSummaryMetadata(value, 4), oldSettings);
        await repository.saveScriptSettings(scriptId, newSettings);
        await repository.saveSummaryMetadata(scriptId, value, buildScriptSummaryMetadata(value, 2), newSettings);
        expect(await repository.saveSummaryMetadata(scriptId, value, buildScriptSummaryMetadata(value, 4), oldSettings)).toBe(false);

        expect((await repository.getScriptSummary(scriptId))?.summaryMetadata?.pageCount).toBe(2);
    });

    it('clears pages on a delayed old-layout document save after settings change', async () => {
        const repository = await setup();
        const value = document('scene');
        const scriptId = await repository.createScript('Delayed save', value);
        const oldSettings = {page: {heightPx: 800}};
        const newSettings = {page: {heightPx: 1600}};

        await repository.saveScriptSettings(scriptId, oldSettings);
        await repository.saveScriptSettings(scriptId, newSettings);

        const next = document('scene', 'scene');

        await repository.saveLatest(scriptId, next, buildScriptSummaryMetadata(next, 4), oldSettings);

        expect((await repository.getScriptSummary(scriptId))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(next));
        expect((await repository.loadLatest(scriptId))?.content.map(node => node.type)).toEqual(['scene', 'scene']);
    });
});
