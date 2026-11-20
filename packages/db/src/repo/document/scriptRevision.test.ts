import type {ScriptDocument} from '@stagistic/script';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../../storage/fileStorage';
import {createTestDb} from '../../testing/createTestDb';
import {createLocalPgliteRepository} from '../createLocalPgliteRepository';
import {ScriptRevisionConflictError} from './scriptRevisionConflict';

const clients: Awaited<ReturnType<typeof createTestDb>>['client'][] = [];
const document = (...texts: string[]): ScriptDocument => ({
    type: 'doc',
    content: texts.map((text, index) => ({
        type: 'stageDirection',
        attrs: {id: `block-${index}`},
        content: [{type: 'text', text}],
    })),
});
const setupTwoTabs = async () => {
    const {db, client} = await createTestDb();

    clients.push(client);

    const open = () => createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });

    return {tabA: open(), tabB: open()};
};
const textsOf = async (repository: ReturnType<typeof createLocalPgliteRepository>, scriptId: string) => {
    const loaded = await repository.loadLatest(scriptId);

    return (loaded?.content ?? []).map(block => block.content?.map(part => part.text).join('') ?? '');
};

afterEach(async () => {
    await Promise.all(clients.splice(0).map(client => client.close()));
});

describe('script revision', () => {
    it('refuses a save from text another tab has since changed, and writes no block', async () => {
        const {tabA, tabB} = await setupTwoTabs();
        const scriptId = await tabA.createScript('Play', document('one'));

        await tabA.loadLatest(scriptId);
        await tabB.loadLatest(scriptId);
        await tabA.saveLatest(scriptId, document('one', 'from A'));

        await expect(tabB.saveLatest(scriptId, document('one', 'from B', 'extra B'))).rejects.toBeInstanceOf(ScriptRevisionConflictError);
        expect(await textsOf(tabA, scriptId)).toEqual(['one', 'from A']);
    });

    it('accepts the next save after the tab reloaded the newer text', async () => {
        const {tabA, tabB} = await setupTwoTabs();
        const scriptId = await tabA.createScript('Play', document('one'));

        await tabA.loadLatest(scriptId);
        await tabB.loadLatest(scriptId);
        await tabA.saveLatest(scriptId, document('one', 'from A'));
        await tabB.loadLatest(scriptId);
        await tabB.saveLatest(scriptId, document('one', 'from A', 'from B'));

        expect(await textsOf(tabA, scriptId)).toEqual([
            'one',
            'from A',
            'from B',
        ]);
    });

    it('lets one tab save repeatedly without reloading', async () => {
        const {tabA} = await setupTwoTabs();
        const scriptId = await tabA.createScript('Play', document('one'));

        await tabA.loadLatest(scriptId);
        await tabA.saveLatest(scriptId, document('one', 'two'));
        await tabA.saveLatest(scriptId, document('one', 'two', 'three'));

        expect(await textsOf(tabA, scriptId)).toEqual([
            'one',
            'two',
            'three',
        ]);
    });

    it('reports the revision in the script summary and moves it only when the text changed', async () => {
        const {tabA} = await setupTwoTabs();
        const scriptId = await tabA.createScript('Play', document('one'));

        await tabA.loadLatest(scriptId);

        const first = (await tabA.getScriptSummary(scriptId))?.revision;

        await tabA.saveLatest(scriptId, document('one'));
        expect((await tabA.getScriptSummary(scriptId))?.revision).toBe(first);

        await tabA.saveLatest(scriptId, document('one', 'two'));
        expect((await tabA.getScriptSummary(scriptId))?.revision).toBe((first ?? 0) + 1);
    });

    it('lets a save that changes no text through even when the tab is behind', async () => {
        const {tabA, tabB} = await setupTwoTabs();
        const scriptId = await tabA.createScript('Play', document('one'));

        await tabA.loadLatest(scriptId);
        await tabB.loadLatest(scriptId);
        await tabA.saveLatest(scriptId, document('one', 'from A'));

        // B's text still equals what B loaded, so it writes no block.
        await expect(tabB.saveLatest(scriptId, document('one'))).resolves.toBeUndefined();
    });
});
