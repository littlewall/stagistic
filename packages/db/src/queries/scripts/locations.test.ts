import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    createTestDb,
    seedScript,
} from '../../testing/createTestDb';
import {
    deleteScriptLocation,
    getScriptLocationById,
    listScriptLocations,
    updateScriptLocationName,
    upsertScriptLocation,
} from './locations';

const location = (overrides: Partial<Parameters<typeof upsertScriptLocation>[1]> = {}) => ({
    id: 'place-1',
    scriptId: 'script-1',
    name: 'Backstage',
    description: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
});

describe('script location queries', () => {
    it('lists locations alphabetically and scoped to the script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');
        await seedScript(db, 'script-2');
        await upsertScriptLocation(db, location({id: 'b', name: 'Backstage'}));
        await upsertScriptLocation(db, location({id: 'a', name: 'Auditorium'}));
        await upsertScriptLocation(db, location({
            id: 'other', scriptId: 'script-2', name: 'Outside',
        }));

        expect((await listScriptLocations(db, 'script-1')).map(row => row.name))
            .toEqual(['Auditorium', 'Backstage']);
    });

    it('renames and deletes only within the requested script', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');
        await seedScript(db, 'script-2');
        await upsertScriptLocation(db, location());
        await upsertScriptLocation(db, location({
            id: 'place-2', scriptId: 'script-2', name: 'Other',
        }));

        await updateScriptLocationName(db, {
            scriptId: 'script-1',
            locationId: 'place-1',
            name: 'Main stage',
            updatedAt: 2,
        });
        await deleteScriptLocation(db, {
            scriptId: 'script-1',
            locationId: 'place-2',
        });

        expect(await getScriptLocationById(db, {
            scriptId: 'script-1', locationId: 'place-1',
        })).toMatchObject({name: 'Main stage', updatedAt: 2});
        expect(await getScriptLocationById(db, {
            scriptId: 'script-2', locationId: 'place-2',
        })).toMatchObject({name: 'Other'});
    });

    it('deletes a location and leaves it absent', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-1');
        await upsertScriptLocation(db, location());
        await deleteScriptLocation(db, {
            scriptId: 'script-1',
            locationId: 'place-1',
        });

        expect(await listScriptLocations(db, 'script-1')).toEqual([]);
    });
});
