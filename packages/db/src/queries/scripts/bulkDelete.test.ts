import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../../testing/createTestDb';
import {deleteScriptAttachmentsByScriptId, insertAttachment, listScriptAttachments} from './attachments';
import {deleteScriptCharacterGendersByScriptId, insertScriptCharacterGenders} from './characters/genders';
import {listScriptCharacters} from './characters/read';
import {deleteScriptCharactersByScriptId, insertScriptCharacters} from './characters/write';
import {deleteScriptLocationsByScriptId, insertScriptLocations, listScriptLocations} from './locations';
import {deleteScriptMusicByScriptId, insertScriptMusic, listScriptMusic} from './music';

describe('bulk delete-by-scriptId queries', () => {
    it('removes only the rows belonging to the given script', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc1');
        await seedScript(db, 'sc2');
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
                id: 'c2',
                scriptId: 'sc2',
                characterKey: 'JUNO',
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
        ]);
        await insertScriptCharacterGenders(db, [
            {id: 'g1', scriptId: 'sc1', genderKey: 'f', genderLabel: 'Female', createdAt: now, updatedAt: now},
            {id: 'g2', scriptId: 'sc2', genderKey: 'f', genderLabel: 'Female', createdAt: now, updatedAt: now},
        ]);
        await insertScriptLocations(db, [
            {id: 'l1', scriptId: 'sc1', name: 'Kitchen', description: null, createdAt: now, updatedAt: now},
            {id: 'l2', scriptId: 'sc2', name: 'Attic', description: null, createdAt: now, updatedAt: now},
        ]);
        await insertScriptMusic(db, {
            id: 'm1',
            scriptId: 'sc1',
            sceneNumber: 1,
            indexInScene: 0,
            mode: 'open',
            title: 'Song',
            kind: null,
            startBlockId: null,
            endBlockId: null,
            createdAt: now,
            updatedAt: now,
        });
        await insertScriptMusic(db, {
            id: 'm2',
            scriptId: 'sc2',
            sceneNumber: 1,
            indexInScene: 0,
            mode: 'open',
            title: 'Other',
            kind: null,
            startBlockId: null,
            endBlockId: null,
            createdAt: now,
            updatedAt: now,
        });
        await insertAttachment(db, {
            id: 'a1',
            scriptId: 'sc1',
            filename: 'a.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            storageKey: 'key-1',
            createdAt: now,
            updatedAt: now,
        });
        await insertAttachment(db, {
            id: 'a2',
            scriptId: 'sc2',
            filename: 'b.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            storageKey: 'key-2',
            createdAt: now,
            updatedAt: now,
        });

        await deleteScriptCharactersByScriptId(db, 'sc1');
        await deleteScriptCharacterGendersByScriptId(db, 'sc1');
        await deleteScriptLocationsByScriptId(db, 'sc1');
        await deleteScriptMusicByScriptId(db, 'sc1');
        await deleteScriptAttachmentsByScriptId(db, 'sc1');

        expect((await listScriptCharacters(db, 'sc1')).length).toBe(0);
        expect((await listScriptCharacters(db, 'sc2')).some(character => character.id === 'c2')).toBe(true);
        expect((await listScriptLocations(db, 'sc1')).length).toBe(0);
        expect((await listScriptLocations(db, 'sc2')).some(location => location.id === 'l2')).toBe(true);
        expect((await listScriptMusic(db, 'sc1')).length).toBe(0);
        expect((await listScriptMusic(db, 'sc2')).some(item => item.id === 'm2')).toBe(true);
        expect((await listScriptAttachments(db, 'sc1')).length).toBe(0);
        expect((await listScriptAttachments(db, 'sc2')).some(attachment => attachment.id === 'a2')).toBe(true);
    });

    it('is a no-op when the script has no rows in a domain', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc3');

        await deleteScriptCharactersByScriptId(db, 'sc3');
        await deleteScriptCharacterGendersByScriptId(db, 'sc3');
        await deleteScriptLocationsByScriptId(db, 'sc3');
        await deleteScriptMusicByScriptId(db, 'sc3');
        await deleteScriptAttachmentsByScriptId(db, 'sc3');

        expect(true).toBe(true);
    });
});
