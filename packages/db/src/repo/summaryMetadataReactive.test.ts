import {buildScriptSummaryMetadata, type ScriptDocument} from '@stagistic/script';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../storage/fileStorage';
import {createLiveTestDb} from '../testing/createLiveTestDb';
import {createLocalPgliteRepository} from './createLocalPgliteRepository';

it('publishes a metadata-only page refresh through the script summary source', async () => {
    const {db, client} = await createLiveTestDb();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });
    const value: ScriptDocument = {
        type: 'doc',
        content: [
            {
                type: 'scene',
                attrs: {id: 'scene-1'},
                content: [],
            },
        ],
    };
    const scriptId = await repository.createScript('Reactive', value);
    const snapshots: Array<number | null | undefined> = [];
    const unsubscribe = await repository.scriptSummaries.subscribe(rows => {
        snapshots.push(rows.find(row => row.id === scriptId)?.summaryMetadata?.pageCount);
    });

    try {
        const before = await repository.getScriptSummary(scriptId);

        await repository.saveSummaryMetadata(scriptId, value, buildScriptSummaryMetadata(value, 4));
        await vi.waitFor(() => expect(snapshots).toContain(4));
        expect(snapshots[0]).toBeNull();
        expect((await repository.scriptSummaries.read())[0]?.summaryMetadata?.pageCount).toBe(4);
        expect((await repository.getScriptSummary(scriptId))?.updatedAt).toBe(before?.updatedAt);
    } finally {
        unsubscribe();
        await client.close();
    }
});
