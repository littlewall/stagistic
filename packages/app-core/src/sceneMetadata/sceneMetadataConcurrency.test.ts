import {expect, it} from 'vite-plus/test';

import {
    characterKey,
    createHarness,
    deferred,
    prepare,
} from './sceneMetadataTestFixtures';

it('keeps the newest outline visible through a rejected earlier edit and stale source echoes', async () => {
    const harness = createHarness();

    await prepare(harness);
    harness.repository.updateSceneSynopsis.mockRejectedValueOnce(new Error('first write failed'));

    const first = harness.actions.updateSceneSynopsis('h1', ' First ');
    const second = harness.actions.updateSceneSynopsis('h1', ' Second ');

    harness.synopsesSource.emit([{headingBlockId: 'h1', synopsis: 'Old source'}]);
    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBe('Second');
    harness.writeGate.resolve();
    await expect(first).rejects.toThrow('first write failed');
    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBe('Second');
    await second;
    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBe('Second');
});

it('keeps an optimistic outline until the source confirms a successful write', async () => {
    const harness = createHarness();

    await prepare(harness);
    harness.repository.updateSceneSynopsis.mockResolvedValueOnce(true);

    const pending = harness.actions.updateSceneSynopsis('h1', 'New');

    await expect.poll(() => harness.repository.updateSceneSynopsis.mock.calls.length).toBe(1);
    harness.synopsesSource.emit([{headingBlockId: 'h1', synopsis: 'Old'}]);
    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBe('New');
    harness.synopsesSource.emit([{headingBlockId: 'h1', synopsis: 'New'}]);
    await pending;
    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBe('New');
});

it('restores a deleted card record and its arc when deletion fails', async () => {
    const harness = createHarness();

    await prepare(harness);
    harness.writeGate.resolve();
    await harness.actions.putSceneCharacter('h1', 'c1', {note: 'Durable', arcValue: 2});

    const gate = deferred();

    harness.repository.removeSceneCharacter.mockImplementationOnce(() => gate.promise);

    const removed = harness.actions.removeSceneCharacter('h1', 'c1');

    expect(harness.store.characters.collection.size).toBe(0);
    gate.reject(new Error('delete failed'));
    await expect(removed).rejects.toThrow('delete failed');
    expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: 'Durable', arcValue: 2});
});

it('shows clearing an outline immediately and restores the durable text on failure', async () => {
    const harness = createHarness();

    await prepare(harness);
    harness.writeGate.resolve();
    await harness.actions.updateSceneSynopsis('h1', 'Durable');
    harness.repository.updateSceneSynopsis.mockRejectedValueOnce(new Error('disk full'));

    const cleared = harness.actions.updateSceneSynopsis('h1', '   ');

    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBeNull();
    await expect(cleared).rejects.toThrow('disk full');
    expect(harness.store.synopses.collection.get('h1')?.synopsis).toBe('Durable');
});
