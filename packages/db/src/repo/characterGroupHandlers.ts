import {normalizeCharacterKey} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {ScriptCharacterGroupRef} from '../types';
import type {
    GetDb,
    RecordOutbox,
} from './types';
import {
    buildCharacterGroupColorPayload,
    buildCharacterGroupCreatePayload,
    buildCharacterGroupDeletePayload,
    buildCharacterGroupMembersPayload,
    buildCharacterGroupRenamePayload,
} from './characterHandlers/outboxPayloads';
import type {CharacterGroupHandlers} from './characterHandlers/types';

interface CreateCharacterGroupHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: () => Promise<void>,
}

export const createCharacterGroupHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateCharacterGroupHandlersArgs): CharacterGroupHandlers => {
    const listScriptCharacterGroups: CharacterGroupHandlers['listScriptCharacterGroups'] = async scriptId => {
        return dbQueries.listScriptCharacterGroups(await getDb(), scriptId);
    };

    const createScriptCharacterGroupWithId: CharacterGroupHandlers['createScriptCharacterGroupWithId'] = async (
        scriptId,
        input,
    ) => {
        const key = normalizeCharacterKey(input.key);

        if (!key) {
            return null;
        }

        const db = await getDb();
        const now = input.timestamp ?? Date.now();
        let created = false;

        await db.transaction(async tx => {
            const existing = await dbQueries.getScriptSpeakingEntityByKey(tx, {
                scriptId,
                characterKey: key,
            });

            if (existing) {
                return;
            }

            await dbQueries.createScriptCharacterGroup(tx, {
                id: input.id,
                scriptId,
                characterKey: key,
                colorHex: input.colorHex ?? null,
                createdAt: now,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character-group:${input.id}`,
                opType: 'character-group.create',
                occurredAt: now,
                payloadJson: buildCharacterGroupCreatePayload(scriptId, input.id, key, input.colorHex ?? null, now),
            }, tx);
            created = true;
        });

        if (!created) {
            return null;
        }

        await syncDb();

        return dbQueries.getScriptCharacterGroupById(db, {scriptId, groupId: input.id});
    };
    const createScriptCharacterGroup: CharacterGroupHandlers['createScriptCharacterGroup'] = (scriptId, key) => {
        return createScriptCharacterGroupWithId(scriptId, {id: uuidv7(), key});
    };

    const renameScriptCharacterGroup: CharacterGroupHandlers['renameScriptCharacterGroup'] = async (
        scriptId,
        groupId,
        nextKey,
    ) => {
        const key = normalizeCharacterKey(nextKey);

        if (!groupId || !key) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        let renamed = false;
        let unchanged: ScriptCharacterGroupRef | null = null;

        await db.transaction(async tx => {
            const current = await dbQueries.getScriptCharacterGroupById(tx, {scriptId, groupId});

            if (!current) {
                return;
            }

            if (current.key === key) {
                unchanged = current;
                return;
            }

            const existing = await dbQueries.getScriptSpeakingEntityByKey(tx, {
                scriptId,
                characterKey: key,
            });

            if (existing && existing.id !== groupId) {
                return;
            }

            await dbQueries.renameScriptCharacterGroup(tx, {
                scriptId,
                groupId,
                characterKey: key,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character-group:${groupId}`,
                opType: 'character-group.rename',
                occurredAt: now,
                payloadJson: buildCharacterGroupRenamePayload(scriptId, groupId, current.key, key, now),
            }, tx);
            renamed = true;
        });

        if (!renamed) {
            return unchanged;
        }

        await syncDb();

        return dbQueries.getScriptCharacterGroupById(db, {scriptId, groupId});
    };

    const deleteScriptCharacterGroup: CharacterGroupHandlers['deleteScriptCharacterGroup'] = async (
        scriptId,
        groupId,
    ) => {
        if (!groupId) {
            return;
        }

        const db = await getDb();
        const now = Date.now();
        let deleted = false;

        await db.transaction(async tx => {
            const current = await dbQueries.getScriptCharacterGroupById(tx, {scriptId, groupId});

            if (!current) {
                return;
            }

            await dbQueries.deleteScriptCharacterGroup(tx, {scriptId, groupId});
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character-group:${groupId}`,
                opType: 'character-group.delete',
                occurredAt: now,
                payloadJson: buildCharacterGroupDeletePayload(scriptId, groupId, current.key, now),
            }, tx);
            deleted = true;
        });

        if (deleted) {
            await syncDb();
        }
    };

    const setScriptCharacterGroupColor: CharacterGroupHandlers['setScriptCharacterGroupColor'] = async (
        scriptId,
        groupId,
        colorHex,
    ) => {
        if (!groupId) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        let updated = false;

        await db.transaction(async tx => {
            const current = await dbQueries.getScriptCharacterGroupById(tx, {scriptId, groupId});

            if (!current) {
                return;
            }

            await dbQueries.setScriptCharacterGroupColor(tx, {
                scriptId,
                groupId,
                colorHex,
                updatedAt: now,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character-group:${groupId}`,
                opType: 'character-group.color',
                occurredAt: now,
                payloadJson: buildCharacterGroupColorPayload(scriptId, groupId, colorHex, now),
            }, tx);
            updated = true;
        });

        if (!updated) {
            return null;
        }

        await syncDb();

        return dbQueries.getScriptCharacterGroupById(db, {scriptId, groupId});
    };

    const replaceScriptCharacterGroupMembers: CharacterGroupHandlers['replaceScriptCharacterGroupMembers'] = async (
        scriptId,
        groupId,
        memberIds,
    ) => {
        if (!groupId) {
            return null;
        }

        const db = await getDb();
        const now = Date.now();
        const targetMemberIds = [...new Set(memberIds)].sort();
        let updated = false;

        await db.transaction(async tx => {
            const group = await dbQueries.getScriptCharacterGroupById(tx, {scriptId, groupId});

            if (!group) {
                return;
            }

            const members = await Promise.all(targetMemberIds.map(memberId => {
                return dbQueries.getScriptSpeakingEntityById(tx, {scriptId, characterId: memberId});
            }));

            if (members.some(member => member?.kind !== 'character')) {
                return;
            }

            await dbQueries.replaceScriptCharacterGroupMembers(tx, {
                groupId,
                memberIds: targetMemberIds,
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox({
                scriptId,
                entityKey: `character-group:${groupId}`,
                opType: 'character-group.members',
                occurredAt: now,
                payloadJson: buildCharacterGroupMembersPayload(scriptId, groupId, targetMemberIds, now),
            }, tx);
            updated = true;
        });

        if (!updated) {
            return null;
        }

        await syncDb();

        return dbQueries.getScriptCharacterGroupById(db, {scriptId, groupId});
    };

    return {
        listScriptCharacterGroups,
        createScriptCharacterGroup,
        createScriptCharacterGroupWithId,
        renameScriptCharacterGroup,
        deleteScriptCharacterGroup,
        setScriptCharacterGroupColor,
        replaceScriptCharacterGroupMembers,
    };
};
