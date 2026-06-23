import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    createTestDb, seedScript, type TestDb,
} from '../../../testing/createTestDb';
import type {UpsertScriptCharacterPayload} from '../payloads';
import {
    getScriptCharacterById,
    getScriptCharacterByKey,
    listScriptCharacters,
} from './read';
import {
    deleteScriptCharacter,
    updateScriptCharacterColor,
    updateScriptCharacterKey,
    upsertScriptCharacter,
} from './write';

const SCRIPT_ID = 'script-1';

const setup = async (): Promise<TestDb> => {
    const {db} = await createTestDb();

    await seedScript(db, SCRIPT_ID);

    return db;
};

const upsert = (db: TestDb, overrides: Partial<UpsertScriptCharacterPayload> = {}) => upsertScriptCharacter(db, {
    id: 'c1',
    scriptId: SCRIPT_ID,
    characterKey: 'ANNA',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
});

describe('script character read/write', () => {
    it('round-trips a character by key, id, and list', async () => {
        const db = await setup();

        await upsert(db, {
            colorHex: '#ffffff',
            genderKey: 'female',
            notes: 'a note',
            backstory: 'a backstory',
        });

        const expected = {
            id: 'c1',
            key: 'ANNA',
            colorHex: '#ffffff',
            genderKey: 'female',
            notes: 'a note',
            backstory: 'a backstory',
        };

        expect(await getScriptCharacterByKey(db, {scriptId: SCRIPT_ID, characterKey: 'ANNA'}))
            .toEqual(expected);
        expect(await getScriptCharacterById(db, {scriptId: SCRIPT_ID, characterId: 'c1'}))
            .toEqual(expected);
        expect(await listScriptCharacters(db, SCRIPT_ID)).toEqual([expected]);
    });

    it('updates the existing row and keeps its id on key conflict', async () => {
        const db = await setup();

        await upsert(db, {id: 'c1', colorHex: '#111111'});
        await upsert(db, {
            id: 'c2', colorHex: '#222222', updatedAt: 2,
        });

        const rows = await listScriptCharacters(db, SCRIPT_ID);

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            id: 'c1', key: 'ANNA', colorHex: '#222222',
        });
    });

    it('clears unset optional fields on upsert', async () => {
        const db = await setup();

        await upsert(db, {colorHex: '#111111', notes: 'keep me'});
        await upsert(db, {updatedAt: 2});

        const row = await getScriptCharacterById(db, {scriptId: SCRIPT_ID, characterId: 'c1'});

        expect(row).toMatchObject({colorHex: null, notes: null});
    });

    it('lists characters ordered by key and scoped to the script', async () => {
        const db = await setup();

        await upsertScriptCharacter(db, {
            id: 'z', scriptId: SCRIPT_ID, characterKey: 'ZARA', createdAt: 1, updatedAt: 1,
        });
        await upsertScriptCharacter(db, {
            id: 'a', scriptId: SCRIPT_ID, characterKey: 'ANNA', createdAt: 1, updatedAt: 1,
        });
        await upsertScriptCharacter(db, {
            id: 'm', scriptId: SCRIPT_ID, characterKey: 'MIRA', createdAt: 1, updatedAt: 1,
        });

        await seedScript(db, 'script-2');
        await upsertScriptCharacter(db, {
            id: 'o', scriptId: 'script-2', characterKey: 'OTHER', createdAt: 1, updatedAt: 1,
        });

        expect((await listScriptCharacters(db, SCRIPT_ID)).map(c => c.key))
            .toEqual([
                'ANNA',
                'MIRA',
                'ZARA',
            ]);
    });

    it('returns null when a character is absent', async () => {
        const db = await setup();

        expect(await getScriptCharacterByKey(db, {scriptId: SCRIPT_ID, characterKey: 'NOPE'}))
            .toBeNull();
        expect(await getScriptCharacterById(db, {scriptId: SCRIPT_ID, characterId: 'nope'}))
            .toBeNull();
    });

    it('updateScriptCharacterColor changes only the color', async () => {
        const db = await setup();

        await upsert(db, {colorHex: '#111111', notes: 'unchanged'});
        await updateScriptCharacterColor(db, {
            scriptId: SCRIPT_ID, characterId: 'c1', colorHex: '#999999', updatedAt: 2,
        });

        const row = await getScriptCharacterById(db, {scriptId: SCRIPT_ID, characterId: 'c1'});

        expect(row).toMatchObject({colorHex: '#999999', notes: 'unchanged'});
    });

    it('updateScriptCharacterKey renames the lookup key', async () => {
        const db = await setup();

        await upsert(db);
        await updateScriptCharacterKey(db, {
            scriptId: SCRIPT_ID, characterId: 'c1', characterKey: 'ANNABEL', updatedAt: 2,
        });

        expect(await getScriptCharacterByKey(db, {scriptId: SCRIPT_ID, characterKey: 'ANNABEL'}))
            .toMatchObject({id: 'c1'});
        expect(await getScriptCharacterByKey(db, {scriptId: SCRIPT_ID, characterKey: 'ANNA'}))
            .toBeNull();
    });

    it('deleteScriptCharacter removes the row', async () => {
        const db = await setup();

        await upsert(db);
        await deleteScriptCharacter(db, {scriptId: SCRIPT_ID, characterId: 'c1'});

        expect(await getScriptCharacterById(db, {scriptId: SCRIPT_ID, characterId: 'c1'}))
            .toBeNull();
        expect(await listScriptCharacters(db, SCRIPT_ID)).toEqual([]);
    });
});
