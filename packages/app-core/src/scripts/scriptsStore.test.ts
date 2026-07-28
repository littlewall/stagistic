import {
    createInMemoryReactiveQuerySource,
    type ScriptRepository,
    type ScriptSummary,
} from '@stagistic/db';
import {createActlessScriptDocument} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptsStore} from './scriptsStore';

const initialScript: ScriptSummary = {
    id: 'script-1',
    title: 'Original',
    subtitle: null,
    activeBlockId: null,
    createdAt: 1,
    updatedAt: 1,
};

const deferred = () => {
    let reject: (error: Error) => void = () => undefined;
    const promise = new Promise<void>((_resolve, rejectPromise) => {
        reject = rejectPromise;
    });

    return {promise, reject};
};

type ScriptsStoreRepository = Pick<
    ScriptRepository,
    | 'scriptSummaries'
    | 'allocateScriptId'
    | 'createScriptWithId'
    | 'duplicateScriptWithId'
    | 'renameScript'
    | 'renameScriptTitle'
    | 'deleteScript'
    | 'setActiveBlock'
>;

const createRepository = () => {
    const source = createInMemoryReactiveQuerySource<ScriptSummary>([initialScript]);
    const createInputs: Parameters<ScriptRepository['createScriptWithId']>[0][] = [];
    let nextId = 1;
    const replaceRow = async (row: ScriptSummary) => {
        const rows = await source.read();

        source.emit([...rows.filter(value => value.id !== row.id), row]);
    };
    const repositoryAdapter: ScriptsStoreRepository = {
        scriptSummaries: source,
        allocateScriptId: () => `allocated-${nextId++}`,
        createScriptWithId: async input => {
            createInputs.push(input);
            await replaceRow({
                id: input.id,
                title: input.title,
                subtitle: null,
                activeBlockId: input.activeBlockId ?? null,
                createdAt: input.timestamp ?? 1,
                updatedAt: input.timestamp ?? 1,
            });
        },
        duplicateScriptWithId: async (sourceId, input) => {
            const rows = await source.read();
            const sourceRow = rows.find(row => row.id === sourceId);

            if (!sourceRow) {
                throw new Error('missing source');
            }

            await replaceRow({
                ...sourceRow,
                id: input.targetScriptId,
                title: input.title,
                createdAt: input.timestamp ?? 1,
                updatedAt: input.timestamp ?? 1,
            });
        },
        renameScript: async (id, input) => {
            const rows = await source.read();
            const row = rows.find(value => value.id === id);

            if (row) {
                await replaceRow({...row, ...input});
            }
        },
        renameScriptTitle: async (id, title) => {
            const rows = await source.read();
            const row = rows.find(value => value.id === id);

            if (row) {
                await replaceRow({...row, title});
            }
        },
        deleteScript: async id => {
            const rows = await source.read();

            source.emit(rows.filter(row => row.id !== id));
        },
        setActiveBlock: async (id, activeBlockId) => {
            const rows = await source.read();
            const row = rows.find(value => value.id === id);

            if (row) {
                await replaceRow({...row, activeBlockId});
            }
        },
    };
    const repository = repositoryAdapter as unknown as ScriptRepository;

    return {
        createInputs, repository, source,
    };
};

describe('scripts store', () => {
    it('preserves an explicitly supplied actless initial document', async () => {
        const {createInputs, repository} = createRepository();
        const store = createScriptsStore(repository);

        await store.scriptsStore.init();
        await store.scriptsStore.createScript(
            'One act',
            createActlessScriptDocument('scene-1'),
        );

        expect(createInputs[0].initialContent?.content.map(node => node.type))
            .toEqual(['scene']);
    });

    it('uses stable optimistic IDs for create and duplicate, then confirms deletes', async () => {
        const {repository} = createRepository();
        const store = createScriptsStore(repository);

        await store.scriptsStore.init();

        const createdId = await store.scriptsStore.createScript(' Created ');
        const duplicateId = await store.scriptsStore.duplicateScript(createdId, {
            title: 'Duplicate',
            copySettings: true,
            copyAttributes: true,
        });

        expect(createdId).toBe('allocated-1');
        expect(duplicateId).toBe('allocated-2');
        expect(store.scriptsCollection.get(createdId)?.title).toBe('Created');
        expect(store.scriptsCollection.get(duplicateId)?.title).toBe('Duplicate');

        await store.scriptsStore.deleteScript(createdId);

        expect(store.scriptsCollection.has(createdId)).toBe(false);
    });

    it('shows a rename immediately and rolls it back when persistence fails', async () => {
        const {repository} = createRepository();
        const gate = deferred();

        repository.renameScriptTitle = async () => gate.promise;

        const store = createScriptsStore(repository);

        await store.scriptsStore.init();

        const rename = store.scriptsStore.renameScriptTitle('script-1', 'Optimistic');

        expect(store.scriptsCollection.get('script-1')?.title).toBe('Optimistic');

        gate.reject(new Error('write failed'));
        await expect(rename).rejects.toThrow('write failed');

        expect(store.scriptsCollection.get('script-1')?.title).toBe('Original');
        expect(store.scriptsStatus.getSnapshot().mutations[0]).toMatchObject({
            entityKey: 'script-1',
            status: 'failed',
        });
    });

    it('applies an external committed source update without invalidation', async () => {
        const {repository, source} = createRepository();
        const store = createScriptsStore(repository);

        await store.scriptsStore.init();
        source.emit([{...initialScript, title: 'External'}]);

        expect(store.scriptsCollection.get('script-1')?.title).toBe('External');
    });
});
