import type {ScriptRepository} from '@stagistic/db';
import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createSceneMetadataActions} from './sceneMetadataActions';
import {
    characterKey,
    createHarness,
    prepare,
} from './sceneMetadataTestFixtures';

it('guards every read-only metadata action before calling the repository', async () => {
    const repository = {
        putSceneCharacter: vi.fn(),
        removeSceneCharacter: vi.fn(),
        updateSceneSynopsis: vi.fn(),
    };
    const actions = createSceneMetadataActions(repository as unknown as ScriptRepository, 's1', true);

    await expect(actions.putSceneCharacter('h1', 'c1', {note: 'No'})).rejects.toThrow('read-only');
    await expect(actions.removeSceneCharacter('h1', 'c1')).rejects.toThrow('read-only');
    await expect(actions.updateSceneSynopsis('h1', 'No')).rejects.toThrow('read-only');
    await expect(actions.createSceneCharacter('h1', 'No')).rejects.toThrow('read-only');
    expect(repository.putSceneCharacter).not.toHaveBeenCalled();
    expect(repository.removeSceneCharacter).not.toHaveBeenCalled();
    expect(repository.updateSceneSynopsis).not.toHaveBeenCalled();
});

describe('scene metadata actions', () => {
    it('shows a note on the card before the write lands, then confirms from the durable row', async () => {
        const harness = createHarness();

        await prepare(harness);

        const pending = harness.actions.putSceneCharacter('h1', 'c1', {note: 'Waits'});

        // Optimistic at once, with placeholder timestamps the durable row will replace.
        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: 'Waits'});

        harness.writeGate.resolve();
        await expect(pending).resolves.toMatchObject({
            headingBlockId: 'h1',
            characterId: 'c1',
            note: 'Waits',
        });
        await expect.poll(() => harness.store.characters.collection.get(characterKey('h1', 'c1'))?.createdAt).toBe(1_001);
        expect(harness.repository.putSceneCharacter).toHaveBeenCalledWith('s1', 'h1', 'c1', {note: 'Waits', arcValue: null});
    });

    it('rolls a rejected note back to the last durable value', async () => {
        const harness = createHarness();

        await prepare(harness);
        harness.repository.putSceneCharacter.mockRejectedValueOnce(new Error('disk full'));

        const pending = harness.actions.putSceneCharacter('h1', 'c1', {note: 'Doomed'});

        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: 'Doomed'});

        harness.writeGate.resolve();
        await expect(pending).rejects.toThrow('disk full');
        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toBeUndefined();
    });

    it('treats a refused write as a failure instead of keeping an optimistic ghost', async () => {
        const harness = createHarness();

        await prepare(harness);

        const pending = harness.actions.putSceneCharacter('h1', 'missing', {note: 'Ghost'});

        expect(harness.store.characters.collection.get(characterKey('h1', 'missing'))).toMatchObject({note: 'Ghost'});

        harness.writeGate.resolve();
        await expect(pending).rejects.toThrow('could not be saved');
        expect(harness.store.characters.collection.get(characterKey('h1', 'missing'))).toBeUndefined();
    });

    it('keeps a failed earlier note from erasing a newer one, and writes them in order', async () => {
        const harness = createHarness();

        await prepare(harness);
        harness.repository.putSceneCharacter.mockRejectedValueOnce(new Error('first write failed'));

        const first = harness.actions.putSceneCharacter('h1', 'c1', {note: 'First'});
        const second = harness.actions.putSceneCharacter('h1', 'c1', {note: 'Second'});

        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: 'Second'});

        harness.writeGate.resolve();
        await expect(first).rejects.toThrow('first write failed');
        await expect(second).resolves.toMatchObject({note: 'Second'});
        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: 'Second'});
        expect(harness.repository.putSceneCharacter.mock.calls.map(call => call[3]?.note)).toEqual(['First', 'Second']);
    });

    it('updates a note without touching the arc, and clears it to null', async () => {
        const harness = createHarness({headings: ['h1']});

        await prepare(harness);

        const seeded = harness.actions.putSceneCharacter('h1', 'c1', {note: 'Old', arcValue: 2});

        harness.writeGate.resolve();
        await expect(seeded).resolves.toMatchObject({note: 'Old', arcValue: 2});

        const updated = harness.actions.putSceneCharacter('h1', 'c1', {note: 'New'});

        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: 'New', arcValue: 2});

        await expect(updated).resolves.toMatchObject({note: 'New', arcValue: 2});
        expect(harness.repository.putSceneCharacter).toHaveBeenLastCalledWith('s1', 'h1', 'c1', {note: 'New'});

        const cleared = harness.actions.putSceneCharacter('h1', 'c1', {note: null});

        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toMatchObject({note: null, arcValue: 2});
        await expect(cleared).resolves.toMatchObject({note: null, arcValue: 2});
    });

    it('removes a record from the card before the delete lands', async () => {
        const harness = createHarness();

        await prepare(harness);

        const seeded = harness.actions.putSceneCharacter('h1', 'c1', {note: 'Leaves'});

        harness.writeGate.resolve();
        await seeded;

        const pending = harness.actions.removeSceneCharacter('h1', 'c1');

        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toBeUndefined();

        await expect(pending).resolves.toBeUndefined();
        expect(harness.repository.removeSceneCharacter).toHaveBeenCalledWith('s1', 'h1', 'c1');
        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toBeUndefined();
    });

    it('shows an outline before it saves, confirms it, and refuses one for a missing scene', async () => {
        const harness = createHarness({headings: ['h1']});

        await prepare(harness);

        const pending = harness.actions.updateSceneSynopsis('h1', 'Ben hides.');

        expect(harness.store.synopses.collection.get('h1')).toMatchObject({synopsis: 'Ben hides.'});

        harness.writeGate.resolve();
        await expect(pending).resolves.toBe(true);
        expect(harness.repository.updateSceneSynopsis).toHaveBeenCalledWith('s1', 'h1', 'Ben hides.');

        const ghost = harness.actions.updateSceneSynopsis('h2', 'No scene');

        expect(harness.store.synopses.collection.get('h2')).toMatchObject({synopsis: 'No scene'});

        harness.writeGate.resolve();
        await expect(ghost).rejects.toThrow('could not be saved');
        expect(harness.store.synopses.collection.get('h2')).toBeUndefined();
    });

    it('leaves rows it did not write alone while another write fails', async () => {
        const harness = createHarness();

        await prepare(harness);
        harness.repository.putSceneCharacter.mockRejectedValueOnce(new Error('disk full'));

        const failing = harness.actions.putSceneCharacter('h1', 'c1', {note: 'Doomed'});
        const surviving = harness.actions.putSceneCharacter('h1', 'c2', {note: 'Stays'});

        harness.writeGate.resolve();
        await expect(failing).rejects.toThrow('disk full');
        await expect(surviving).resolves.toMatchObject({note: 'Stays'});
        expect(harness.store.characters.collection.get(characterKey('h1', 'c1'))).toBeUndefined();
        expect(harness.store.characters.collection.get(characterKey('h1', 'c2'))).toMatchObject({note: 'Stays'});
        expect(harness.durableCharacters()).toHaveLength(1);
    });
});
