import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import * as dbQueries from '../../queries';
import {createTestDb, seedScript} from '../../testing/createTestDb';
import {createCharacterHandlers} from './handlers';

describe('character handlers', () => {
    it('uses caller IDs and flushes every standalone metadata mutation', async () => {
        const {db} = await createTestDb();
        const scriptId = 'script-1';
        const syncDb = vi.fn(() => Promise.resolve());
        const handlers = createCharacterHandlers({
            getDb: () => Promise.resolve(db),
            recordOutbox: () => Promise.resolve(),
            syncDb,
        });

        await seedScript(db, scriptId);

        const confirmed = await handlers.confirmScriptCharacterWithId(scriptId, {
            id: 'character-stable',
            key: ' alice ',
            timestamp: 10,
        });
        const gender = await handlers.upsertScriptCharacterGenderWithId(scriptId, {
            id: 'gender-stable',
            label: 'Non Binary',
            timestamp: 11,
        });

        expect(confirmed).toMatchObject({id: 'character-stable', key: 'ALICE'});
        expect(gender).toEqual({
            id: 'gender-stable',
            key: 'non binary',
            label: 'Non Binary',
        });

        await handlers.setScriptCharacterColor(scriptId, 'character-stable', '#123456');
        await handlers.setScriptCharacterGender(scriptId, 'character-stable', 'non binary');
        await handlers.setScriptCharacterOutline(scriptId, 'character-stable', 'Arc');
        await handlers.renameScriptCharacter(scriptId, 'character-stable', 'ALICIA');
        await handlers.deleteScriptCharacter(scriptId, 'character-stable');

        expect(syncDb).toHaveBeenCalledTimes(7);
        expect(await dbQueries.listScriptCharacters(db, scriptId)).toEqual([]);
    });
});
