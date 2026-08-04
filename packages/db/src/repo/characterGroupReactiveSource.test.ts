import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    createLocalPgliteRepository,
    InMemoryFileStorage,
} from '../index';
import {dbSchema} from '../schema';
import {createLiveTestDb} from '../testing/createLiveTestDb';
import {seedScript} from '../testing/createTestDb';

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for group source snapshot');
        }

        await new Promise(resolve => setTimeout(resolve, 5));
    }
};

describe('character group reactive source', () => {
    it('refreshes a group snapshot when its membership row changes', async () => {
        const {db} = await createLiveTestDb();
        const repository = createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: new InMemoryFileStorage(),
        });
        const scriptId = 'script-1';

        await seedScript(db, scriptId);
        await db.insert(dbSchema.scriptCharacters).values([
            {
                id: 'group-all', scriptId, characterKey: 'ALL', kind: 'group',
                colorHex: null, genderKey: null, notes: null, backstory: null, outline: null,
                createdAt: 1, updatedAt: 1,
            },
            {
                id: 'character-alice', scriptId, characterKey: 'ALICE', kind: 'character',
                colorHex: null, genderKey: null, notes: null, backstory: null, outline: null,
                createdAt: 1, updatedAt: 1,
            },
        ]);
        const snapshots: string[][] = [];
        const unsubscribe = await repository.getScriptCharacterGroupsSource(scriptId).subscribe(rows => {
            snapshots.push(rows.map(row => `${row.id}:${row.memberIds.join(',')}`));
        });

        await db.insert(dbSchema.scriptCharacterGroupMembers).values({
            groupId: 'group-all',
            characterId: 'character-alice',
        });
        await waitFor(() => snapshots.some(rows => rows.includes('group-all:character-alice')));

        expect(snapshots[0]).toEqual(['group-all:']);
        unsubscribe();
    });
});
