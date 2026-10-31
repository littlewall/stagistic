import {
    createInMemoryReactiveQuerySource,
    type ScriptCharacterRef,
    type ScriptRepository,
} from '@stagistic/db';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {getScriptCharactersStore} from '../characters/scriptCharactersStoreRegistry';
import {
    characterKey,
    createHarness,
    deferred,
    prepare,
} from './sceneMetadataTestFixtures';

const setup = async () => {
    const harness = createHarness({headings: ['h1', 'h2']});
    const catalogSource = createInMemoryReactiveQuerySource<ScriptCharacterRef>([]);
    const genders = createInMemoryReactiveQuerySource([]);
    const creationGate = deferred();
    const repository = Object.assign(harness.repository, {
        allocateScriptCharacterId: () => 'new-character',
        getScriptCharactersSource: () => catalogSource,
        getScriptCharacterGendersSource: () => genders,
        confirmScriptCharacterWithId: vi.fn(async (_scriptId: string, input: {id: string, key: string}) => {
            await creationGate.promise;

            const row: ScriptCharacterRef = {
                ...input,
                kind: 'character',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
            };

            catalogSource.emit([row]);

            return row;
        }),
    });
    const catalog = getScriptCharactersStore(repository as unknown as ScriptRepository, 's1');

    await prepare(harness);
    await catalog.charactersCollection.preload();

    return {
        ...harness,
        repository,
        catalog,
        creationGate,
        catalogSource,
    };
};

it('shows a newly created character on its card before either write finishes', async () => {
    const harness = await setup();
    const pending = harness.actions.createSceneCharacter('h1', 'New character');
    const repeatedConfirmation = harness.catalog.confirmCharacter('New character');
    const secondCard = harness.actions.putSceneCharacter('h2', 'new-character', {});

    expect(harness.catalog.charactersCollection.get('new-character')?.key).toBe('NEW CHARACTER');
    expect(harness.store.characters.collection.has(characterKey('h1', 'new-character'))).toBe(true);
    expect(harness.store.characters.collection.has(characterKey('h2', 'new-character'))).toBe(true);
    harness.writeGate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(harness.repository.putSceneCharacter).not.toHaveBeenCalled();

    harness.creationGate.resolve();
    await Promise.all([
        pending,
        secondCard,
        repeatedConfirmation,
    ]);
    expect(harness.repository.confirmScriptCharacterWithId).toHaveBeenCalledTimes(1);
    expect(harness.durableCharacters()).toHaveLength(2);
});

it('rolls back both cards and the catalog when character creation fails', async () => {
    const harness = await setup();
    const pending = harness.actions.createSceneCharacter('h1', 'New character');
    const secondCard = harness.actions.putSceneCharacter('h2', 'new-character', {});
    const outcomes = Promise.allSettled([pending, secondCard]);

    harness.writeGate.resolve();
    await expect.poll(() => harness.repository.confirmScriptCharacterWithId.mock.calls.length).toBe(1);
    harness.creationGate.reject(new Error('disk full'));
    expect((await outcomes).every(result => result.status === 'rejected')).toBe(true);
    expect(harness.store.characters.collection.size).toBe(0);
    expect(harness.catalog.charactersCollection.size).toBe(0);
    expect(harness.repository.putSceneCharacter).not.toHaveBeenCalled();
});

it('preserves immediate removal and re-adding while a character is being created', async () => {
    const harness = await setup();
    const pending = harness.actions.createSceneCharacter('h1', 'New character');
    const removed = harness.actions.removeSceneCharacter('h1', 'new-character');

    expect(harness.store.characters.collection.size).toBe(0);

    const added = harness.actions.putSceneCharacter('h1', 'new-character', {note: 'Newest'});

    expect(harness.store.characters.collection.get(characterKey('h1', 'new-character'))?.note).toBe('Newest');
    harness.writeGate.resolve();
    harness.creationGate.resolve();
    await Promise.all([
        pending,
        removed,
        added,
    ]);
    expect(harness.durableCharacters()).toMatchObject([{note: 'Newest'}]);
    expect(harness.store.characters.collection.get(characterKey('h1', 'new-character'))?.note).toBe('Newest');
});

it('never reattaches a card removed before creation finishes', async () => {
    const harness = await setup();
    const pending = harness.actions.createSceneCharacter('h1', 'New character');
    const removed = harness.actions.removeSceneCharacter('h1', 'new-character');

    expect(harness.store.characters.collection.size).toBe(0);
    harness.writeGate.resolve();
    harness.creationGate.resolve();
    await Promise.all([pending, removed]);
    expect(harness.durableCharacters()).toHaveLength(0);
    expect(harness.store.characters.collection.size).toBe(0);
});
