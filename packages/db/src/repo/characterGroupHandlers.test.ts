import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    dbSchema,
    scriptCharacterGroupMembers,
    scriptCharacters,
} from '../schema';
import {
    createTestDb,
    seedScript,
} from '../testing/createTestDb';
import {createCharacterGroupHandlers} from './characterGroupHandlers';
import {createCharacterHandlers} from './characterHandlers/handlers';
import type {OutboxPayload} from './types';

const createHandlers = async () => {
    const {db} = await createTestDb();
    const syncDb = vi.fn(() => Promise.resolve());
    const outboxPayloads: OutboxPayload[] = [];
    const mutationDeps = {
        getDb: () => Promise.resolve(db),
        recordOutbox: (payload: OutboxPayload) => {
            outboxPayloads.push(payload);

            return Promise.resolve();
        },
        syncDb,
    };

    return {
        db,
        characterHandlers: createCharacterHandlers(mutationDeps),
        groupHandlers: createCharacterGroupHandlers(mutationDeps),
        outboxPayloads,
        syncDb,
    };
};

describe('character group handlers', () => {
    it('persists group mutations with timestamped outbox events and one sync each', async () => {
        const {
            db,
            groupHandlers,
            outboxPayloads,
            syncDb,
        } = await createHandlers();
        const scriptId = 'script-1';

        await seedScript(db, scriptId);
        await db.insert(scriptCharacters).values({
            id: 'character-alice',
            scriptId,
            characterKey: 'ALICE',
            kind: 'character',
            colorHex: null,
            genderKey: null,
            notes: null,
            backstory: null,
            outline: null,
            createdAt: 1,
            updatedAt: 1,
        });
        await groupHandlers.createScriptCharacterGroupWithId(scriptId, {
            id: 'group-all', key: 'All', colorHex: '#112233', timestamp: 100,
        });
        vi.spyOn(Date, 'now').mockReturnValueOnce(200);
        await groupHandlers.renameScriptCharacterGroup(scriptId, 'group-all', 'Ensemble');
        vi.spyOn(Date, 'now').mockReturnValueOnce(300);
        await groupHandlers.setScriptCharacterGroupColor(scriptId, 'group-all', '#abcdef');
        vi.spyOn(Date, 'now').mockReturnValueOnce(400);
        await groupHandlers.replaceScriptCharacterGroupMembers(scriptId, 'group-all', ['character-alice']);
        vi.spyOn(Date, 'now').mockReturnValueOnce(500);
        await groupHandlers.deleteScriptCharacterGroup(scriptId, 'group-all');

        expect(await db.select().from(scriptCharacterGroupMembers)).toEqual([]);
        expect((await db.select().from(scriptCharacters)).find(row => row.id === 'group-all')).toBeUndefined();
        expect((await db.select().from(dbSchema.scripts))[0]?.updatedAt).toBe(500);
        expect(syncDb).toHaveBeenCalledTimes(5);
        expect(outboxPayloads.map(payload => ({
            opType: payload.opType,
            payload: JSON.parse(payload.payloadJson) as Record<string, unknown>,
        }))).toEqual([
            {opType: 'character-group.create',
                payload: {
                    scriptId, groupId: 'group-all', key: 'ALL', colorHex: '#112233', createdAt: 100,
                }},
            {opType: 'character-group.rename',
                payload: {
                    scriptId, groupId: 'group-all', previousKey: 'ALL', nextKey: 'ENSEMBLE', renamedAt: 200,
                }},
            {opType: 'character-group.color',
                payload: {
                    scriptId, groupId: 'group-all', colorHex: '#abcdef', updatedAt: 300,
                }},
            {opType: 'character-group.members',
                payload: {
                    scriptId, groupId: 'group-all', memberIds: ['character-alice'], updatedAt: 400,
                }},
            {opType: 'character-group.delete',
                payload: {
                    scriptId, groupId: 'group-all', key: 'ENSEMBLE', deletedAt: 500,
                }},
        ]);
    });

    it('creates normalized groups and rejects character key collisions', async () => {
        const {
            db,
            characterHandlers,
            groupHandlers,
        } = await createHandlers();
        const scriptId = 'script-1';

        await seedScript(db, scriptId);

        const group = await groupHandlers.createScriptCharacterGroupWithId(scriptId, {
            id: 'group-all',
            key: ' all ',
            colorHex: '#112233',
            timestamp: 10,
        });

        expect(group).toEqual({
            id: 'group-all',
            kind: 'group',
            key: 'ALL',
            colorHex: '#112233',
            memberIds: [],
        });
        expect(await groupHandlers.createScriptCharacterGroup(scriptId, 'all')).toBeNull();
        expect(await characterHandlers.confirmScriptCharacter(scriptId, 'ALL')).toBeNull();
        expect(await groupHandlers.listScriptCharacterGroups(scriptId)).toEqual([group]);
    });

    it('renames a group only to an unused cross-kind key and updates its color', async () => {
        const {
            db,
            characterHandlers,
            groupHandlers,
        } = await createHandlers();
        const scriptId = 'script-1';

        await seedScript(db, scriptId);
        await characterHandlers.confirmScriptCharacterWithId(scriptId, {
            id: 'character-alice',
            key: 'Alice',
            timestamp: 10,
        });
        await groupHandlers.createScriptCharacterGroupWithId(scriptId, {
            id: 'group-all',
            key: 'All',
            timestamp: 11,
        });

        expect(await groupHandlers.renameScriptCharacterGroup(scriptId, 'group-all', 'Alice')).toBeNull();
        expect(await groupHandlers.renameScriptCharacterGroup(scriptId, 'group-all', ' ensemble ')).toMatchObject({
            id: 'group-all',
            key: 'ENSEMBLE',
        });
        expect(await groupHandlers.setScriptCharacterGroupColor(scriptId, 'group-all', '#abcdef')).toMatchObject({
            id: 'group-all',
            colorHex: '#abcdef',
        });
    });

    it('replaces memberships as a deduplicated full set and rejects invalid sets without writing', async () => {
        const {
            db,
            characterHandlers,
            groupHandlers,
        } = await createHandlers();
        const scriptId = 'script-1';

        await seedScript(db, scriptId);
        await seedScript(db, 'script-2');
        await characterHandlers.confirmScriptCharacterWithId(scriptId, {
            id: 'character-alice',
            key: 'Alice',
            timestamp: 10,
        });
        await characterHandlers.confirmScriptCharacterWithId(scriptId, {
            id: 'character-bob',
            key: 'Bob',
            timestamp: 11,
        });
        await characterHandlers.confirmScriptCharacterWithId('script-2', {
            id: 'character-zoe',
            key: 'Zoe',
            timestamp: 12,
        });
        await groupHandlers.createScriptCharacterGroupWithId(scriptId, {
            id: 'group-all',
            key: 'All',
            timestamp: 13,
        });
        await groupHandlers.createScriptCharacterGroupWithId(scriptId, {
            id: 'group-ensemble',
            key: 'Ensemble',
            timestamp: 14,
        });

        expect(await groupHandlers.replaceScriptCharacterGroupMembers(
            scriptId,
            'group-all',
            ['character-alice'],
        )).toMatchObject({
            memberIds: ['character-alice'],
        });
        expect(await groupHandlers.replaceScriptCharacterGroupMembers(
            scriptId,
            'group-all',
            ['character-bob', 'character-bob'],
        )).toMatchObject({
            memberIds: ['character-bob'],
        });
        expect(await groupHandlers.replaceScriptCharacterGroupMembers(
            scriptId,
            'group-all',
            ['character-zoe'],
        )).toBeNull();
        expect(await groupHandlers.replaceScriptCharacterGroupMembers(
            scriptId,
            'group-all',
            ['group-ensemble'],
        )).toBeNull();
        expect(await groupHandlers.listScriptCharacterGroups(scriptId)).toContainEqual({
            id: 'group-all',
            kind: 'group',
            key: 'ALL',
            colorHex: null,
            memberIds: ['character-bob'],
        });
    });

    it('cascades memberships when a group or member character is deleted', async () => {
        const {
            db,
            characterHandlers,
            groupHandlers,
        } = await createHandlers();
        const scriptId = 'script-1';

        await seedScript(db, scriptId);
        await characterHandlers.confirmScriptCharacterWithId(scriptId, {
            id: 'character-alice',
            key: 'Alice',
            timestamp: 10,
        });
        await groupHandlers.createScriptCharacterGroupWithId(scriptId, {
            id: 'group-all',
            key: 'All',
            timestamp: 11,
        });
        await groupHandlers.replaceScriptCharacterGroupMembers(scriptId, 'group-all', ['character-alice']);

        await characterHandlers.deleteScriptCharacter(scriptId, 'character-alice');
        expect(await groupHandlers.listScriptCharacterGroups(scriptId)).toContainEqual({
            id: 'group-all',
            kind: 'group',
            key: 'ALL',
            colorHex: null,
            memberIds: [],
        });

        await characterHandlers.confirmScriptCharacterWithId(scriptId, {
            id: 'character-bob',
            key: 'Bob',
            timestamp: 12,
        });
        await groupHandlers.replaceScriptCharacterGroupMembers(scriptId, 'group-all', ['character-bob']);
        expect(await db.select().from(scriptCharacterGroupMembers)).toEqual([
            {
                groupId: 'group-all',
                characterId: 'character-bob',
            },
        ]);
        await groupHandlers.deleteScriptCharacterGroup(scriptId, 'group-all');
        expect(await db.select().from(scriptCharacterGroupMembers)).toEqual([]);
    });
});
