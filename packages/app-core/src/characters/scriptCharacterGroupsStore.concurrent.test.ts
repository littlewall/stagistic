import {
    createInMemoryReactiveQuerySource,
    type InMemoryReactiveQuerySource,
    type ScriptCharacterGroupRef,
    type ScriptCharacterRef,
    type ScriptRepository,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptCharacterGroupsStore} from './scriptCharacterGroupsStore';

const character = (): ScriptCharacterRef => ({
    id: 'character-1',
    kind: 'character',
    key: 'ALICE',
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
});

const group = (id: string, key: string): ScriptCharacterGroupRef => ({
    id,
    kind: 'group',
    key,
    colorHex: null,
    memberIds: [],
});

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(resolvePromise => {
        resolve = resolvePromise;
    });

    return {promise, resolve};
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for overlapping group actions');
        }

        await new Promise(resolve => setTimeout(resolve, 5));
    }
};

const blockReads = (source: InMemoryReactiveQuerySource<ScriptCharacterRef>) => {
    const gate = deferred();
    const read = source.read.bind(source);
    let count = 0;

    source.read = async () => {
        count += 1;
        await gate.promise;

        return read();
    };

    return {
        gate,
        count: () => count,
    };
};

const createRepository = (initialGroups: ScriptCharacterGroupRef[]) => {
    const characters = createInMemoryReactiveQuerySource([character()]);
    const groups = createInMemoryReactiveQuerySource(initialGroups);
    const actions = {creates: 0, renames: 0};
    let confirmedGroups = [...initialGroups];
    let nextId = 1;
    const repository = {
        allocateScriptCharacterGroupId: () => `new-group-${nextId++}`,
        getScriptCharactersSource: () => characters,
        getScriptCharacterGroupsSource: () => groups,
        createScriptCharacterGroupWithId: (
            _scriptId: string,
            input: {id: string, key: string},
        ) => {
            actions.creates += 1;

            const created = group(input.id, input.key);

            confirmedGroups = [...confirmedGroups, created];
            groups.emit(confirmedGroups);

            return Promise.resolve(created);
        },
        renameScriptCharacterGroup: (_scriptId: string, id: string, key: string) => {
            actions.renames += 1;

            const original = confirmedGroups.find(row => row.id === id);

            if (!original) {
                return Promise.resolve(null);
            }

            const renamed = {...original, key};

            confirmedGroups = confirmedGroups.map(row => {
                return row.id === id ? renamed : row;
            });
            groups.emit(confirmedGroups);

            return Promise.resolve(renamed);
        },
    } as unknown as ScriptRepository;

    return {
        repository, characters, groups, actions,
    };
};

describe('script character groups store concurrency', () => {
    it('allows only one overlapping create for the same normalized key', async () => {
        const {
            repository, characters, groups, actions,
        } = createRepository([]);
        const blocked = blockReads(characters);
        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        const creations = [store.createGroup(' players '), store.createGroup('PLAYERS')];

        await waitFor(() => blocked.count() === 2);
        blocked.gate.resolve();

        const results = await Promise.all(creations);

        expect(results.filter(Boolean)).toHaveLength(1);
        expect(results.filter(result => result === null)).toHaveLength(1);
        expect(actions.creates).toBe(1);
        expect(await groups.read()).toHaveLength(1);
        expect(Array.from(store.groupsCollection.values())).toHaveLength(1);
    });

    it('allows only one overlapping rename to the same normalized key', async () => {
        const initial = [group('group-1', 'ENSEMBLE'), group('group-2', 'CHORUS')];
        const {
            repository, characters, groups, actions,
        } = createRepository(initial);
        const blocked = blockReads(characters);
        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        const renames = [store.renameGroup('group-1', ' players '), store.renameGroup('group-2', 'PLAYERS')];

        await waitFor(() => blocked.count() === 2);
        blocked.gate.resolve();

        const results = await Promise.all(renames);

        expect(results.filter(Boolean)).toHaveLength(1);
        expect(results.filter(result => result === null)).toHaveLength(1);
        expect(actions.renames).toBe(1);
        expect((await groups.read()).map(row => row.key).sort()).toEqual(['CHORUS', 'PLAYERS']);
        expect(Array.from(store.groupsCollection.values())).toHaveLength(2);
    });
});
