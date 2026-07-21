import {
    createInMemoryReactiveQuerySource,
    type ScriptMusic,
    type ScriptRepository,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptMusicStore} from './scriptMusicStore';

const music = (overrides: Partial<ScriptMusic> = {}): ScriptMusic => ({
    id: 'music-1',
    scriptId: 'script-1',
    sceneNumber: 0,
    indexInScene: 0,
    mode: 'open',
    title: 'Overture',
    kind: 'song',
    startBlockId: null,
    endBlockId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
});

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise, resolve, reject,
    };
};

type MusicRepository = Pick<
    ScriptRepository,
    | 'allocateScriptMusicId'
    | 'getScriptMusicSource'
    | 'createScriptMusicWithId'
    | 'updateScriptMusic'
    | 'deleteScriptMusic'
>;

const createRepository = (initialRows: ScriptMusic[] = [music()]) => {
    const source = createInMemoryReactiveQuerySource(initialRows);
    let nextId = 1;
    const adapter: MusicRepository = {
        allocateScriptMusicId: () => `new-music-${nextId++}`,
        getScriptMusicSource: () => source,
        createScriptMusicWithId: async (scriptId, input) => {
            const created = music({
                id: input.id,
                scriptId,
                title: input.title,
                kind: input.kind,
                createdAt: input.timestamp ?? 1,
                updatedAt: input.timestamp ?? 1,
            });

            source.emit([...await source.read(), created]);

            return created;
        },
        updateScriptMusic: async (_scriptId, musicId, input) => {
            const original = (await source.read()).find(row => row.id === musicId);

            if (!original) {
                return null;
            }

            const updated = {
                ...original, ...input, updatedAt: original.updatedAt + 1,
            };

            source.emit((await source.read()).map(row => {
                return row.id === musicId ? updated : row;
            }));

            return updated;
        },
        deleteScriptMusic: async (_scriptId, musicId) => {
            source.emit((await source.read()).filter(row => row.id !== musicId));
        },
    };

    return {
        repository: adapter as unknown as ScriptRepository,
        source,
    };
};

describe('script music store', () => {
    it('shows a stable-id create before persistence and confirms it from the source', async () => {
        const {repository, source} = createRepository([]);
        const gate = deferred();
        const originalCreate = repository.createScriptMusicWithId.bind(repository);

        repository.createScriptMusicWithId = async (...args) => {
            await gate.promise;

            return originalCreate(...args);
        };

        const store = createScriptMusicStore(repository, 'script-1');

        await store.collection.preload();

        const create = store.createMusic({title: ' Finale ', kind: 'instrumental'});

        expect(store.collection.get('new-music-1')).toMatchObject({
            title: 'Finale',
            kind: 'instrumental',
        });
        expect(await source.read()).toEqual([]);

        gate.resolve();
        await create;

        expect(await source.read()).toHaveLength(1);
    });

    it('rejects an empty title before allocating or persisting', async () => {
        const {repository, source} = createRepository([]);
        const store = createScriptMusicStore(repository, 'script-1');

        await store.collection.preload();

        await expect(store.createMusic({title: '   ', kind: 'song'})).resolves.toBeNull();
        expect(await source.read()).toEqual([]);
        expect(repository.allocateScriptMusicId()).toBe('new-music-1');
    });

    it('rolls a failed update back and exposes the failure', async () => {
        const {repository} = createRepository();
        const gate = deferred();

        repository.updateScriptMusic = () => gate.promise.then(() => null);

        const store = createScriptMusicStore(repository, 'script-1');

        await store.collection.preload();

        const update = store.updateMusic('music-1', {title: 'Rejected', kind: 'song'});

        expect(store.collection.get('music-1')?.title).toBe('Rejected');

        gate.reject(new Error('write failed'));
        await expect(update).rejects.toThrow('write failed');

        expect(store.collection.get('music-1')?.title).toBe('Overture');
        expect(store.status.getSnapshot().mutations[0]).toMatchObject({
            entityKey: 'music-1',
            status: 'failed',
        });
    });

    it('hides a deleted music before persistence completes', async () => {
        const {repository, source} = createRepository();
        const gate = deferred();
        const originalDelete = repository.deleteScriptMusic.bind(repository);

        repository.deleteScriptMusic = async (...args) => {
            await gate.promise;
            await originalDelete(...args);
        };

        const store = createScriptMusicStore(repository, 'script-1');

        await store.collection.preload();

        const deletion = store.deleteMusic('music-1');

        expect(store.collection.has('music-1')).toBe(false);
        expect(await source.read()).toHaveLength(1);

        gate.resolve();
        await deletion;

        expect(await source.read()).toEqual([]);
    });

    it('serializes rapid edits while keeping the newest intent visible', async () => {
        const {repository, source} = createRepository();
        const gates = [deferred(), deferred()];
        let callIndex = 0;
        const originalUpdate = repository.updateScriptMusic.bind(repository);

        repository.updateScriptMusic = async (...args) => {
            const currentGate = gates[callIndex++];

            await currentGate.promise;

            return originalUpdate(...args);
        };

        const store = createScriptMusicStore(repository, 'script-1');

        await store.collection.preload();

        const first = store.updateMusic('music-1', {title: 'First', kind: 'song'});
        const second = store.updateMusic('music-1', {title: 'Newest', kind: 'instrumental'});

        expect(store.collection.get('music-1')).toMatchObject({
            title: 'Newest',
            kind: 'instrumental',
        });

        gates[0].resolve();
        await first;

        expect(store.collection.get('music-1')?.title).toBe('Newest');

        gates[1].resolve();
        await second;

        expect((await source.read())[0]).toMatchObject({
            title: 'Newest',
            kind: 'instrumental',
        });
    });

    it('accepts assignment projection changes from the shared source', async () => {
        const {repository, source} = createRepository();
        const store = createScriptMusicStore(repository, 'script-1');

        await store.collection.preload();
        source.emit([music({startBlockId: 'block-1', endBlockId: 'block-2'})]);

        expect(store.collection.get('music-1')).toMatchObject({
            startBlockId: 'block-1',
            endBlockId: 'block-2',
        });
    });
});
