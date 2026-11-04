import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    characterKey,
    createHarness,
    prepare,
} from './sceneMetadataTestFixtures';

type Harness = ReturnType<typeof createHarness>;

const record = (harness: Harness) => harness.store.characters.collection.get(characterKey('h1', 'c1'));
const open = async () => {
    const harness = createHarness();

    await prepare(harness);

    return harness;
};

describe('arc point record rules', () => {
    it('keeps the card state of a script note and deletes the point record once nothing is left', async () => {
        const harness = await open();

        harness.writeGate.resolve();
        await harness.actions.setArcPoint('h1', 'c1', 40);
        await harness.actions.putSceneCharacter('h1', 'c1', {note: 'Seen'}, true);
        expect(record(harness)).toMatchObject({onCard: true, note: 'Seen'});
        await harness.actions.putSceneCharacter('h1', 'c1', {note: null}, true);
        await harness.actions.removeArcPoint('h1', 'c1');
        expect(record(harness)).toBeUndefined();
        await harness.actions.putSceneCharacter('h1', 'c1', {note: 'New'}, true);
        expect(record(harness)).toMatchObject({onCard: false, note: 'New'});
    });

    it('creates an on-card record for a point without a record, optimistically', async () => {
        const harness = await open();
        const pending = harness.actions.setArcPoint('h1', 'c1', 40);

        expect(record(harness)).toMatchObject({arcValue: 40, onCard: true});
        harness.writeGate.resolve();
        await pending;
        expect(harness.repository.putSceneCharacter).toHaveBeenCalledWith('s1', 'h1', 'c1', {
            note: null,
            arcValue: 40,
            onCard: true,
        });
        expect(harness.durableCharacters()).toEqual([expect.objectContaining({arcValue: 40, onCard: true})]);
    });

    it('puts an existing off-card record on the card when a point is set', async () => {
        const harness = await open();

        harness.writeGate.resolve();
        await harness.actions.putSceneCharacter('h1', 'c1', {note: 'Here'});
        await harness.actions.setArcPoint('h1', 'c1', -100);
        expect(record(harness)).toMatchObject({
            note: 'Here',
            arcValue: -100,
            onCard: true,
        });
        await harness.actions.removeSceneCharacter('h1', 'c1');
        await harness.actions.setArcPoint('h1', 'c1', 10);
        expect(record(harness)).toMatchObject({arcValue: 10, onCard: true});
    });

    it('moves a legacy off-card record onto the card when a point is set', async () => {
        const harness = createHarness();

        harness.seedCharacter({
            scriptId: 's1',
            headingBlockId: 'h1',
            characterId: 'c1',
            note: null,
            arcValue: 5,
            onCard: false,
            createdAt: 1,
            updatedAt: 2,
        });
        await prepare(harness);
        harness.writeGate.resolve();
        await harness.actions.setArcPoint('h1', 'c1', 70);
        expect(record(harness)).toMatchObject({arcValue: 70, onCard: true});
        expect(harness.durableCharacters()).toEqual([expect.objectContaining({arcValue: 70, onCard: true})]);
    });

    it('rejects values outside -100...100', async () => {
        const harness = await open();

        await expect(harness.actions.setArcPoint('h1', 'c1', 101)).rejects.toThrow(RangeError);
        await expect(harness.actions.setArcPoint('h1', 'c1', 1.5)).rejects.toThrow(RangeError);
        expect(record(harness)).toBeUndefined();
    });

    it('removes from the card: always deletes the record, arc value included', async () => {
        const harness = await open();

        harness.writeGate.resolve();
        await harness.actions.putSceneCharacter('h1', 'c1', {note: 'Leaves', arcValue: 20});

        const removed = harness.actions.removeSceneCharacter('h1', 'c1');

        expect(record(harness)).toBeUndefined();
        await removed;
        expect(harness.durableCharacters()).toEqual([]);

        await harness.actions.putSceneCharacter('h1', 'c2', {note: 'Plain'});
        await harness.actions.removeSceneCharacter('h1', 'c2');
        expect(harness.store.characters.collection.get(characterKey('h1', 'c2'))).toBeUndefined();
    });

    it('removes a point: keeps a record with a note, deletes one without', async () => {
        const harness = await open();

        harness.writeGate.resolve();
        await harness.actions.putSceneCharacter('h1', 'c1', {note: 'Stays', arcValue: 30});
        await harness.actions.removeArcPoint('h1', 'c1');
        expect(record(harness)).toMatchObject({
            note: 'Stays',
            arcValue: null,
            onCard: true,
        });

        await harness.actions.putSceneCharacter('h1', 'c2', {arcValue: -5});

        const pending = harness.actions.removeArcPoint('h1', 'c2');

        expect(harness.store.characters.collection.get(characterKey('h1', 'c2'))).toBeUndefined();
        await pending;
        expect(harness.durableCharacters().map(row => row.characterId)).toEqual(['c1']);
        await expect(harness.actions.removeArcPoint('h1', 'none')).resolves.toBeUndefined();
    });

    it('keeps a legacy off-card record whose note remains when its point is removed', async () => {
        const harness = createHarness();

        harness.seedCharacter({
            scriptId: 's1',
            headingBlockId: 'h1',
            characterId: 'c1',
            note: 'Kept',
            arcValue: 5,
            onCard: false,
            createdAt: 1,
            updatedAt: 2,
        });
        await prepare(harness);
        harness.writeGate.resolve();
        await harness.actions.removeArcPoint('h1', 'c1');
        expect(record(harness)).toMatchObject({
            note: 'Kept',
            arcValue: null,
            onCard: true,
        });
    });

    it('restores the record when removing from the card fails', async () => {
        const harness = await open();

        harness.writeGate.resolve();
        await harness.actions.putSceneCharacter('h1', 'c1', {note: 'Durable', arcValue: 2});
        harness.repository.removeSceneCharacter.mockRejectedValueOnce(new Error('disk full'));

        const removed = harness.actions.removeSceneCharacter('h1', 'c1');

        expect(record(harness)).toBeUndefined();
        await expect(removed).rejects.toThrow('disk full');
        expect(record(harness)).toMatchObject({
            note: 'Durable',
            arcValue: 2,
            onCard: true,
        });
    });

    it('rolls a rejected point back and keeps writes in order', async () => {
        const harness = await open();

        harness.repository.putSceneCharacter.mockRejectedValueOnce(new Error('disk full'));

        const first = harness.actions.setArcPoint('h1', 'c1', 10);
        const second = harness.actions.setArcPoint('h1', 'c1', 20);

        harness.writeGate.resolve();
        await expect(first).rejects.toThrow('disk full');
        await second;
        expect(record(harness)).toMatchObject({arcValue: 20});
        expect(harness.repository.putSceneCharacter.mock.calls.map(call => call[3].arcValue)).toEqual([10, 20]);
    });
});
