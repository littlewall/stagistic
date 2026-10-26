import {
    createLocalPgliteRepository,
    InMemoryFileStorage,
    ReadOnlyScriptRepositoryError,
    type ScriptRepository,
} from '@stagistic/db';
import {createTestDb} from '@stagistic/db/testing';
import {createEmptyScriptDocument} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createSnapshotViewRepository} from './createSnapshotViewRepository';
import {
    createScriptSnapshotFromCurrent,
    loadScriptSnapshot,
    saveScriptSnapshotFromView,
} from './scriptSnapshotOperations';

const SCRIPT_ID = 'script-1';

const setup = async () => {
    const {db} = await createTestDb();
    const fileStorage = new InMemoryFileStorage();
    const live = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage,
    });
    let createdDatabases = 0;
    const views = createSnapshotViewRepository({
        createLocalDb: async () => {
            createdDatabases += 1;

            return (await createTestDb()).db;
        },
        fileStorage,
    });

    await live.createScriptWithId({
        id: SCRIPT_ID,
        title: 'The door',
        initialContent: createEmptyScriptDocument(),
    });

    const snapshotOf = async (title: string) => {
        await live.renameScriptTitle(SCRIPT_ID, title);

        const snapshot = await createScriptSnapshotFromCurrent({
            repository: live,
            scriptId: SCRIPT_ID,
            kind: 'draft',
        });
        const loaded = await loadScriptSnapshot({
            repository: live,
            scriptId: SCRIPT_ID,
            snapshotId: requireValue(snapshot).id,
        });

        if (!loaded.ok) throw new Error('snapshot did not load');

        return loaded.snapshot;
    };

    return {
        live,
        views,
        snapshotOf,
        getCreatedDatabases: () => createdDatabases,
    };
};

const contentMutations = (repository: ScriptRepository) => [
    () => repository.saveLatest(SCRIPT_ID, createEmptyScriptDocument()),
    () => repository.setActiveBlock(SCRIPT_ID, null),
    () => repository.createScriptMusic(SCRIPT_ID, {title: 'Song', kind: 'song'}),
    () => repository.deleteScript(SCRIPT_ID),
];

describe('snapshot view repository', () => {
    it('serves the stored state and rejects every content mutation', async () => {
        const {views, snapshotOf} = await setup();
        const repository = await views.open(await snapshotOf('Draft one title'));

        expect((await repository.getScriptSummary(SCRIPT_ID))?.title).toBe('Draft one title');
        expect(await repository.loadLatest(SCRIPT_ID)).not.toBeNull();

        for (const mutate of contentMutations(repository)) {
            await expect(mutate()).rejects.toBeInstanceOf(ReadOnlyScriptRepositoryError);
        }
    });

    it('lets settings change and saves them back into the snapshot', async () => {
        const {live, views} = await setup();
        const snapshot = requireValue(await createScriptSnapshotFromCurrent({
            repository: live,
            scriptId: SCRIPT_ID,
            kind: 'version',
            name: 'Festival',
        }));
        const loaded = await loadScriptSnapshot({
            repository: live,
            scriptId: SCRIPT_ID,
            snapshotId: snapshot.id,
        });

        if (!loaded.ok) throw new Error('snapshot did not load');

        let writes = 0;
        const repository = await views.open(loaded.snapshot, {
            onSettingsWrite: () => {
                writes += 1;
            },
        });

        await repository.saveSummaryMetadata(SCRIPT_ID, createEmptyScriptDocument(), {
            pageCount: 1,
            sceneCount: 0,
            actSceneCounts: [],
            unassignedSceneCount: 0,
        });

        // A recomputed summary alone is not an edit.
        expect(writes).toBe(0);

        await repository.renameScriptTitle(SCRIPT_ID, 'The door (festival cut)');

        expect(writes).toBe(1);

        await saveScriptSnapshotFromView({
            viewRepository: repository,
            liveRepository: live,
            scriptId: SCRIPT_ID,
            snapshotId: snapshot.id,
        });

        const reloaded = await loadScriptSnapshot({
            repository: live,
            scriptId: SCRIPT_ID,
            snapshotId: snapshot.id,
        });

        expect(reloaded.ok && reloaded.snapshot.script.title).toBe('The door (festival cut)');
        expect((await live.getScriptSummary(SCRIPT_ID))?.title).toBe('The door');
    });

    it('reuses one database and replaces the previously opened state', async () => {
        const {
            live,
            views,
            snapshotOf,
            getCreatedDatabases,
        } = await setup();
        const first = await snapshotOf('First');
        const second = await snapshotOf('Second');

        await views.open(first);

        const repository = await views.open(second);

        expect(getCreatedDatabases()).toBe(1);
        expect((await repository.listScripts()).map(script => script.title)).toEqual(['Second']);
        expect((await live.getScriptSummary(SCRIPT_ID))?.title).toBe('Second');
    });
});
