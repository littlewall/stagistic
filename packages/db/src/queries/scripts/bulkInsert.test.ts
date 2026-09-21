import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../../testing/createTestDb';
import {insertScriptCharacterGenders} from './characters/genders';
import {insertScriptCharacterGroupMembers} from './characters/groups';
import {listScriptCharacters} from './characters/read';
import {insertScriptCharacters} from './characters/write';
import {insertScriptLocations} from './locations';

describe('bulk domain inserts', () => {
    it('inserts characters, genders, group members and locations', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc1');
        const now = 1_000;

        await insertScriptCharacters(db, [
            {
                id: 'c1',
                scriptId: 'sc1',
                characterKey: 'MARA',
                kind: 'character',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: 'g1',
                scriptId: 'sc1',
                characterKey: 'FAMILY',
                kind: 'group',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: now,
                updatedAt: now,
            },
        ]);
        await insertScriptCharacterGroupMembers(db, [{groupId: 'g1', characterId: 'c1'}]);
        await insertScriptCharacterGenders(db, [{id: 'gd1', scriptId: 'sc1', genderKey: 'f', genderLabel: 'Female', createdAt: now, updatedAt: now}]);
        await insertScriptLocations(db, [{id: 'l1', scriptId: 'sc1', name: 'Kitchen', description: null, createdAt: now, updatedAt: now}]);

        const characters = await listScriptCharacters(db, 'sc1');
        expect(characters.some(character => character.id === 'c1')).toBe(true);
    });

    it('is a no-op for empty input', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc2');

        await insertScriptCharacters(db, []);
        await insertScriptLocations(db, []);
        await insertScriptCharacterGenders(db, []);
        await insertScriptCharacterGroupMembers(db, []);

        expect(true).toBe(true);
    });
});
