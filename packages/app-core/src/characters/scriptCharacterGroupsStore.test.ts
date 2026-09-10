import {
    createInMemoryReactiveQuerySource,
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

const character = (id: string, key: string): ScriptCharacterRef => ({
    id,
    kind: 'character',
    key,
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
});

const group = (overrides: Partial<ScriptCharacterGroupRef> = {}): ScriptCharacterGroupRef => ({
    id: 'group-1',
    kind: 'group',
    key: 'ENSEMBLE',
    colorHex: null,
    memberIds: ['character-1'],
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

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for the group store');
        }

        await new Promise(resolve => setTimeout(resolve, 5));
    }
};

type GroupsRepository = Pick<
    ScriptRepository,
    | 'allocateScriptCharacterGroupId'
    | 'getScriptCharactersSource'
    | 'getScriptCharacterGroupsSource'
    | 'createScriptCharacterGroupWithId'
    | 'deleteScriptCharacterGroup'
    | 'renameScriptCharacterGroup'
    | 'setScriptCharacterGroupColor'
    | 'replaceScriptCharacterGroupMembers'
>;

const createRepository = (
    initialGroups: ScriptCharacterGroupRef[] = [group()],
    initialCharacters: ScriptCharacterRef[] = [character('character-1', 'ALICE')],
) => {
    const characters = createInMemoryReactiveQuerySource(initialCharacters);
    const groups = createInMemoryReactiveQuerySource(initialGroups);
    let nextGroupId = 1;
    const updateGroup = async (id: string, changes: Partial<ScriptCharacterGroupRef>) => {
        const original = (await groups.read()).find(row => row.id === id);

        if (!original) {
            return null;
        }

        const updated = {...original, ...changes};

        groups.emit((await groups.read()).map(row => {
            return row.id === id ? updated : row;
        }));

        return updated;
    };
    const adapter: GroupsRepository = {
        allocateScriptCharacterGroupId: () => `new-group-${nextGroupId++}`,
        getScriptCharactersSource: () => characters,
        getScriptCharacterGroupsSource: () => groups,
        createScriptCharacterGroupWithId: async (_scriptId, input) => {
            const created = group({
                id: input.id,
                key: input.key,
                colorHex: input.colorHex ?? null,
                memberIds: [],
            });

            groups.emit([...await groups.read(), created]);

            return created;
        },
        deleteScriptCharacterGroup: async (_scriptId, id) => {
            groups.emit((await groups.read()).filter(row => row.id !== id));
        },
        renameScriptCharacterGroup: (_scriptId, id, key) => updateGroup(id, {key}),
        setScriptCharacterGroupColor: (_scriptId, id, colorHex) => {
            return updateGroup(id, {colorHex});
        },
        replaceScriptCharacterGroupMembers: (_scriptId, id, memberIds) => {
            return updateGroup(id, {memberIds: [...new Set(memberIds)].sort()});
        },
    };

    return {
        repository: adapter as unknown as ScriptRepository,
        groups,
    };
};

describe('script character groups store', () => {
    it('creates a normalized group optimistically with a stable ID', async () => {
        const {repository, groups} = createRepository([]);
        const gate = deferred();
        const create = repository.createScriptCharacterGroupWithId.bind(repository);

        repository.createScriptCharacterGroupWithId = async (...args) => {
            await gate.promise;

            return create(...args);
        };

        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        const creation = store.createGroup(' ensemble ');

        await waitFor(() => store.groupsCollection.has('new-group-1'));
        expect(store.groupsCollection.get('new-group-1')).toMatchObject({
            key: 'ENSEMBLE',
            memberIds: [],
        });
        expect(store.actionStatus.getSnapshot().mutations).toContainEqual(expect.objectContaining({
            entityKey: 'ENSEMBLE',
            action: 'create',
            status: 'pending',
        }));
        expect(await groups.read()).toEqual([]);

        gate.resolve();
        await expect(creation).resolves.toMatchObject({id: 'new-group-1', key: 'ENSEMBLE'});
    });

    it.each([
        [
            'colorHex',
            'setScriptCharacterGroupColor',
            '#abcdef',
            'setGroupColor',
        ], [
            'memberIds',
            'replaceScriptCharacterGroupMembers',
            ['character-2'],
            'replaceGroupMembers',
        ],
    ] as const)('updates %s optimistically through its dedicated action', async (
        field,
        method,
        value,
        action,
    ) => {
        const {repository, groups} = createRepository();
        const gate = deferred();

        if (method === 'setScriptCharacterGroupColor') {
            const update = repository.setScriptCharacterGroupColor.bind(repository);

            repository.setScriptCharacterGroupColor = (...args) => {
                return gate.promise.then(() => update(...args));
            };
        } else {
            const update = repository.replaceScriptCharacterGroupMembers.bind(repository);

            repository.replaceScriptCharacterGroupMembers = (...args) => {
                return gate.promise.then(() => update(...args));
            };
        }

        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        const mutation = store[action]('group-1', value as never);

        expect(store.groupsCollection.get('group-1')?.[field]).toEqual(value);
        expect(store.actionStatus.getSnapshot().mutations).toContainEqual(expect.objectContaining({
            entityKey: 'group-1',
            action: field,
            status: 'pending',
        }));
        expect((await groups.read())[0]?.[field]).not.toEqual(value);

        gate.resolve();
        await mutation;

        expect((await groups.read())[0]?.[field]).toEqual(value);
    });

    it('rejects normalized character-key collisions before optimistic create or rename', async () => {
        const {repository} = createRepository();
        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        await expect(store.createGroup(' alice ')).resolves.toBeNull();
        await expect(store.renameGroup('group-1', ' Alice ')).resolves.toBeNull();

        expect(Array.from(store.groupsCollection.values())).toHaveLength(1);
        expect(store.groupsCollection.get('group-1')).toMatchObject(group());
    });

    it('refreshes the confirmed collection after rename', async () => {
        const {repository, groups} = createRepository();
        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        await expect(store.renameGroup('group-1', ' chorus ')).resolves.toMatchObject({
            id: 'group-1',
            key: 'CHORUS',
        });

        expect((await groups.read())[0]?.key).toBe('CHORUS');
        expect(store.groupsCollection.get('group-1')?.key).toBe('CHORUS');
    });

    it('rolls a rejected membership update back to confirmed member IDs', async () => {
        const {repository} = createRepository();
        const gate = deferred();

        repository.replaceScriptCharacterGroupMembers = () => gate.promise.then(() => null);

        const store = createScriptCharacterGroupsStore(repository, 'script-1');

        await store.groupsCollection.preload();

        const mutation = store.replaceGroupMembers('group-1', ['character-2']);

        expect(store.groupsCollection.get('group-1')?.memberIds).toEqual(['character-2']);

        gate.reject(new Error('membership failed'));
        await expect(mutation).rejects.toThrow('membership failed');

        expect(store.groupsCollection.get('group-1')?.memberIds).toEqual(['character-1']);
        expect(store.actionStatus.getSnapshot().mutations).toContainEqual(expect.objectContaining({
            entityKey: 'group-1',
            action: 'memberIds',
            status: 'failed',
        }));
    });
});
