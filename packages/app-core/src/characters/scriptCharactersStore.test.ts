import {
    createInMemoryReactiveQuerySource,
    type ScriptCharacterGenderOption,
    type ScriptCharacterRef,
    type ScriptRepository,
} from '@stagistic/db';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createScriptCharactersStore} from './scriptCharactersStore';

const character = (overrides: Partial<ScriptCharacterRef> = {}): ScriptCharacterRef => ({
    id: 'character-1',
    kind: 'character',
    key: 'ALICE',
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
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

type CharactersRepository = Pick<
    ScriptRepository,
    | 'allocateScriptCharacterId'
    | 'allocateScriptCharacterGenderId'
    | 'getScriptCharactersSource'
    | 'getScriptCharacterGendersSource'
    | 'confirmScriptCharacterWithId'
    | 'deleteScriptCharacter'
    | 'renameScriptCharacter'
    | 'setScriptCharacterColor'
    | 'setScriptCharacterGender'
    | 'setScriptCharacterOutline'
    | 'upsertScriptCharacterGenderWithId'
>;

const createRepository = (initialCharacters: ScriptCharacterRef[] = [character()]) => {
    const characters = createInMemoryReactiveQuerySource(initialCharacters);
    const genders = createInMemoryReactiveQuerySource<ScriptCharacterGenderOption>([]);
    let nextCharacterId = 1;
    let nextGenderId = 1;
    const updateCharacter = async (
        characterId: string,
        changes: Partial<ScriptCharacterRef>,
    ) => {
        const original = (await characters.read()).find(row => row.id === characterId);

        if (!original) {
            return null;
        }

        const updated = {...original, ...changes};

        characters.emit((await characters.read()).map(row => {
            return row.id === characterId ? updated : row;
        }));

        return updated;
    };
    const adapter: CharactersRepository = {
        allocateScriptCharacterId: () => `new-character-${nextCharacterId++}`,
        allocateScriptCharacterGenderId: () => `new-gender-${nextGenderId++}`,
        getScriptCharactersSource: () => characters,
        getScriptCharacterGendersSource: () => genders,
        confirmScriptCharacterWithId: async (_scriptId, input) => {
            const confirmed = character({
                id: input.id,
                key: input.key,
                colorHex: input.colorHex ?? null,
            });

            characters.emit([...await characters.read(), confirmed]);

            return confirmed;
        },
        deleteScriptCharacter: async (_scriptId, characterId) => {
            characters.emit((await characters.read()).filter(row => row.id !== characterId));
        },
        renameScriptCharacter: async (_scriptId, characterId, nextKey) => {
            const target = (await characters.read()).find(row => row.key === nextKey);

            if (target && target.id !== characterId) {
                characters.emit((await characters.read()).filter(row => row.id !== characterId));

                return target;
            }

            return updateCharacter(characterId, {key: nextKey});
        },
        setScriptCharacterColor: (_scriptId, id, colorHex) => {
            return updateCharacter(id, {colorHex});
        },
        setScriptCharacterGender: (_scriptId, id, genderKey) => {
            return updateCharacter(id, {genderKey});
        },
        setScriptCharacterOutline: (_scriptId, id, outline) => {
            return updateCharacter(id, {outline});
        },
        upsertScriptCharacterGenderWithId: async (_scriptId, input) => {
            const option = {
                id: input.id,
                key: input.label.toLocaleLowerCase(),
                label: input.label,
            };

            genders.emit([...await genders.read(), option]);

            return option;
        },
    };

    return {
        repository: adapter as unknown as ScriptRepository,
        characters,
        genders,
    };
};

describe('script characters store', () => {
    it('confirms with a stable ID optimistically and persists the initial color', async () => {
        const {repository, characters} = createRepository([]);
        const gate = deferred();
        const originalConfirm = repository.confirmScriptCharacterWithId.bind(repository);

        repository.confirmScriptCharacterWithId = async (...args) => {
            await gate.promise;

            return originalConfirm(...args);
        };

        const store = createScriptCharactersStore(repository, 'script-1');

        await Promise.all([store.charactersCollection.preload(), store.gendersCollection.preload()]);

        const confirmation = store.confirmCharacter(' alice ', '#112233');

        expect(store.charactersCollection.get('new-character-1')).toMatchObject({
            key: 'ALICE',
            colorHex: '#112233',
        });
        expect(store.actionStatus.getSnapshot().mutations).toContainEqual(expect.objectContaining({
            entityKey: 'ALICE',
            action: 'confirm',
            status: 'pending',
        }));
        expect(await characters.read()).toEqual([]);

        gate.resolve();
        await confirmation;

        expect((await characters.read())[0]).toMatchObject({
            id: 'new-character-1',
            colorHex: '#112233',
        });
    });

    it.each([
        [
            'colorHex',
            'setScriptCharacterColor',
            '#abcdef',
        ],
        [
            'genderKey',
            'setScriptCharacterGender',
            'female',
        ],
        [
            'outline',
            'setScriptCharacterOutline',
            'A difficult choice',
        ],
    ] as const)('rolls back a failed %s update', async (field, method, value) => {
        const {repository} = createRepository();
        const gate = deferred();

        repository[method] = () => gate.promise.then(() => null);

        const store = createScriptCharactersStore(repository, 'script-1');

        await Promise.all([store.charactersCollection.preload(), store.gendersCollection.preload()]);

        const updates = {
            colorHex: () => store.setCharacterColor('character-1', value),
            genderKey: () => store.setCharacterGender('character-1', value),
            outline: () => store.setCharacterOutline('character-1', value),
        };
        const update = updates[field]();

        expect(store.charactersCollection.get('character-1')?.[field]).toBe(value);

        gate.reject(new Error(`${field} failed`));
        await expect(update).rejects.toThrow(`${field} failed`);

        expect(store.charactersCollection.get('character-1')?.[field]).toBeNull();
        expect(store.actionStatus.getSnapshot().mutations).toContainEqual(expect.objectContaining({
            entityKey: 'character-1',
            action: field,
            status: 'failed',
        }));
    });

    it('keeps the newest outline visible while same-character writes serialize', async () => {
        const {repository, characters} = createRepository();
        const gates = [deferred(), deferred()];
        let callIndex = 0;
        const originalUpdate = repository.setScriptCharacterOutline.bind(repository);

        repository.setScriptCharacterOutline = async (...args) => {
            const gate = gates[callIndex++];

            await gate.promise;

            return originalUpdate(...args);
        };

        const store = createScriptCharactersStore(repository, 'script-1');

        await Promise.all([store.charactersCollection.preload(), store.gendersCollection.preload()]);

        const first = store.setCharacterOutline('character-1', 'First');
        const second = store.setCharacterOutline('character-1', 'Newest');

        expect(store.charactersCollection.get('character-1')?.outline).toBe('Newest');

        gates[0].resolve();
        await first;
        expect(store.charactersCollection.get('character-1')?.outline).toBe('Newest');

        gates[1].resolve();
        await second;

        expect((await characters.read())[0]?.outline).toBe('Newest');
    });

    it('creates a normalized gender with a stable ID and reuses an existing key', async () => {
        const {repository, genders} = createRepository();
        const store = createScriptCharactersStore(repository, 'script-1');

        await Promise.all([store.charactersCollection.preload(), store.gendersCollection.preload()]);

        const first = await store.createGender('  Non   Binary  ');
        const second = await store.createGender('Non Binary');

        expect(first).toEqual({
            id: 'new-gender-1',
            key: 'non binary',
            label: 'Non Binary',
        });
        expect(second?.id).toBe(first?.id);
        expect(await genders.read()).toHaveLength(1);
    });

    it('rolls back a rejected gender option and validates before allocating', async () => {
        const {repository} = createRepository();

        repository.upsertScriptCharacterGenderWithId = () => {
            return Promise.reject(new Error('duplicate gender'));
        };

        const store = createScriptCharactersStore(repository, 'script-1');

        await Promise.all([store.charactersCollection.preload(), store.gendersCollection.preload()]);

        await expect(store.createGender('   ')).resolves.toBeNull();

        const creation = store.createGender('Guest');

        expect(store.gendersCollection.get('new-gender-1')?.label).toBe('Guest');
        await expect(creation).rejects.toThrow('duplicate gender');
        expect(store.gendersCollection.has('new-gender-1')).toBe(false);
    });

    it('confirms a rename merge from source state without a list reload', async () => {
        const {repository, characters} = createRepository([character(), character({id: 'character-2', key: 'BOB'})]);
        const store = createScriptCharactersStore(repository, 'script-1');

        await Promise.all([store.charactersCollection.preload(), store.gendersCollection.preload()]);

        const renamed = await store.renameCharacter('character-1', 'BOB');

        expect(renamed?.id).toBe('character-2');
        expect(await characters.read()).toEqual([character({id: 'character-2', key: 'BOB'})]);
        expect(Array.from(store.charactersCollection.values())).toHaveLength(1);
    });
});
