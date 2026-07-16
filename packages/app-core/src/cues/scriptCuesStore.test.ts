import {
    createInMemoryReactiveQuerySource,
    type ScriptCue,
    type ScriptRepository,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptCuesStore} from './scriptCuesStore';

const cue = (overrides: Partial<ScriptCue> = {}): ScriptCue => ({
    id: 'cue-1',
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

type CuesRepository = Pick<
    ScriptRepository,
    | 'allocateScriptCueId'
    | 'getScriptCuesSource'
    | 'createScriptCueWithId'
    | 'updateScriptCue'
    | 'deleteScriptCue'
>;

const createRepository = (initialRows: ScriptCue[] = [cue()]) => {
    const source = createInMemoryReactiveQuerySource(initialRows);
    let nextId = 1;
    const adapter: CuesRepository = {
        allocateScriptCueId: () => `new-cue-${nextId++}`,
        getScriptCuesSource: () => source,
        createScriptCueWithId: async (scriptId, input) => {
            const created = cue({
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
        updateScriptCue: async (_scriptId, cueId, input) => {
            const original = (await source.read()).find(row => row.id === cueId);

            if (!original) {
                return null;
            }

            const updated = {
                ...original, ...input, updatedAt: original.updatedAt + 1,
            };

            source.emit((await source.read()).map(row => {
                return row.id === cueId ? updated : row;
            }));

            return updated;
        },
        deleteScriptCue: async (_scriptId, cueId) => {
            source.emit((await source.read()).filter(row => row.id !== cueId));
        },
    };

    return {
        repository: adapter as unknown as ScriptRepository,
        source,
    };
};

describe('script cues store', () => {
    it('shows a stable-id create before persistence and confirms it from the source', async () => {
        const {repository, source} = createRepository([]);
        const gate = deferred();
        const originalCreate = repository.createScriptCueWithId.bind(repository);

        repository.createScriptCueWithId = async (...args) => {
            await gate.promise;

            return originalCreate(...args);
        };

        const store = createScriptCuesStore(repository, 'script-1');

        await store.collection.preload();

        const create = store.createCue({title: ' Finale ', kind: 'instrumental'});

        expect(store.collection.get('new-cue-1')).toMatchObject({
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
        const store = createScriptCuesStore(repository, 'script-1');

        await store.collection.preload();

        await expect(store.createCue({title: '   ', kind: 'song'})).resolves.toBeNull();
        expect(await source.read()).toEqual([]);
        expect(repository.allocateScriptCueId()).toBe('new-cue-1');
    });

    it('rolls a failed update back and exposes the failure', async () => {
        const {repository} = createRepository();
        const gate = deferred();

        repository.updateScriptCue = () => gate.promise.then(() => null);

        const store = createScriptCuesStore(repository, 'script-1');

        await store.collection.preload();

        const update = store.updateCue('cue-1', {title: 'Rejected', kind: 'song'});

        expect(store.collection.get('cue-1')?.title).toBe('Rejected');

        gate.reject(new Error('write failed'));
        await expect(update).rejects.toThrow('write failed');

        expect(store.collection.get('cue-1')?.title).toBe('Overture');
        expect(store.status.getSnapshot().mutations[0]).toMatchObject({
            entityKey: 'cue-1',
            status: 'failed',
        });
    });

    it('hides a deleted cue before persistence completes', async () => {
        const {repository, source} = createRepository();
        const gate = deferred();
        const originalDelete = repository.deleteScriptCue.bind(repository);

        repository.deleteScriptCue = async (...args) => {
            await gate.promise;
            await originalDelete(...args);
        };

        const store = createScriptCuesStore(repository, 'script-1');

        await store.collection.preload();

        const deletion = store.deleteCue('cue-1');

        expect(store.collection.has('cue-1')).toBe(false);
        expect(await source.read()).toHaveLength(1);

        gate.resolve();
        await deletion;

        expect(await source.read()).toEqual([]);
    });

    it('serializes rapid edits while keeping the newest intent visible', async () => {
        const {repository, source} = createRepository();
        const gates = [deferred(), deferred()];
        let callIndex = 0;
        const originalUpdate = repository.updateScriptCue.bind(repository);

        repository.updateScriptCue = async (...args) => {
            const currentGate = gates[callIndex++];

            await currentGate.promise;

            return originalUpdate(...args);
        };

        const store = createScriptCuesStore(repository, 'script-1');

        await store.collection.preload();

        const first = store.updateCue('cue-1', {title: 'First', kind: 'song'});
        const second = store.updateCue('cue-1', {title: 'Newest', kind: 'instrumental'});

        expect(store.collection.get('cue-1')).toMatchObject({
            title: 'Newest',
            kind: 'instrumental',
        });

        gates[0].resolve();
        await first;

        expect(store.collection.get('cue-1')?.title).toBe('Newest');

        gates[1].resolve();
        await second;

        expect((await source.read())[0]).toMatchObject({
            title: 'Newest',
            kind: 'instrumental',
        });
    });

    it('accepts assignment projection changes from the shared source', async () => {
        const {repository, source} = createRepository();
        const store = createScriptCuesStore(repository, 'script-1');

        await store.collection.preload();
        source.emit([cue({startBlockId: 'block-1', endBlockId: 'block-2'})]);

        expect(store.collection.get('cue-1')).toMatchObject({
            startBlockId: 'block-1',
            endBlockId: 'block-2',
        });
    });
});
