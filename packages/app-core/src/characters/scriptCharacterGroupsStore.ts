import type {
    ScriptCharacterGroupRef,
    ScriptRepository,
} from '@stagistic/db';
import {normalizeCharacterKey} from '@stagistic/script';

import {
    createReactiveCollection,
    createReactiveCollectionStatusStore,
    createRepositoryStoreRegistry,
    toDomainCollectionValue,
} from '../collections';

type GroupField = 'key' | 'colorHex' | 'memberIds';

const normalizeIds = (ids: string[]) => [...new Set(ids)].sort();

export const createScriptCharacterGroupsStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const groupsSource = repository.getScriptCharacterGroupsSource(scriptId);
    const charactersSource = repository.getScriptCharactersSource(scriptId);
    const actionStatus = createReactiveCollectionStatusStore();
    const groups = createReactiveCollection<ScriptCharacterGroupRef, string>({
        id: `script-character-groups:${scriptId}`,
        source: groupsSource,
        getKey: group => group.id,
        handlers: {
            insert: async group => {
                const created = await repository.createScriptCharacterGroupWithId(scriptId, {
                    id: group.id,
                    key: group.key,
                    colorHex: group.colorHex,
                });

                if (!created) {
                    throw new Error('The character group could not be created');
                }
            },
            update: async (original, modified, changes) => {
                const fieldCommands: Partial<Record<GroupField, () => Promise<unknown>>> = {
                    key: () => repository.renameScriptCharacterGroup(
                        scriptId,
                        original.id,
                        modified.key,
                    ),
                    colorHex: () => repository.setScriptCharacterGroupColor(
                        scriptId,
                        original.id,
                        modified.colorHex,
                    ),
                    memberIds: () => repository.replaceScriptCharacterGroupMembers(
                        scriptId,
                        original.id,
                        modified.memberIds,
                    ),
                };
                const changedFields = Object.keys(changes).filter(
                    (field): field is GroupField => field in fieldCommands,
                );

                for (const field of changedFields) {
                    const updated = await fieldCommands[field]?.();

                    if (!updated) {
                        throw new Error(`The character group ${field} could not be saved`);
                    }
                }
            },
            delete: group => repository.deleteScriptCharacterGroup(scriptId, group.id),
        },
    });

    actionStatus.setReady();

    const runAction = async <T>(
        entityKey: string,
        action: string,
        task: () => Promise<T>,
    ) => {
        actionStatus.startMutation({entityKey, action});

        try {
            const result = await task();

            actionStatus.finishMutation(entityKey, action);

            return result;
        } catch (error) {
            const normalizedError = error instanceof Error
                ? error
                : new Error(String(error));

            actionStatus.failMutation(entityKey, action, normalizedError);
            throw normalizedError;
        }
    };

    const hasGroupKeyCollision = (key: string, excludedGroupId?: string) => {
        return Array.from(groups.collection.values()).some(group => {
            return group.id !== excludedGroupId && normalizeCharacterKey(group.key) === key;
        });
    };
    const hasCharacterKeyCollision = async (key: string) => {
        return (await charactersSource.read()).some(character => {
            return normalizeCharacterKey(character.key) === key;
        });
    };

    const resultFor = (id: string) => {
        const value = groups.collection.get(id);

        return value ? toDomainCollectionValue(value) : null;
    };

    const updateGroup = async (
        id: string,
        changes: Partial<Pick<ScriptCharacterGroupRef, GroupField>>,
        action: GroupField,
    ) => {
        if (!groups.collection.has(id)) {
            return null;
        }

        const transaction = groups.collection.update(id, draft => {
            Object.assign(draft, changes);
        });

        return runAction(id, action, async () => {
            await transaction.isPersisted.promise;

            return resultFor(id);
        });
    };

    const createGroup = async (key: string) => {
        const normalizedKey = normalizeCharacterKey(key);

        if (!normalizedKey || hasGroupKeyCollision(normalizedKey)) {
            return null;
        }

        if (await hasCharacterKeyCollision(normalizedKey)
            || hasGroupKeyCollision(normalizedKey)) {
            return null;
        }

        const id = repository.allocateScriptCharacterGroupId();
        const transaction = groups.collection.insert({
            id,
            kind: 'group',
            key: normalizedKey,
            colorHex: null,
            memberIds: [],
        });

        return runAction(normalizedKey, 'create', async () => {
            await transaction.isPersisted.promise;

            return resultFor(id);
        });
    };

    const deleteGroup = async (id: string) => {
        if (!groups.collection.has(id)) {
            return;
        }

        const transaction = groups.collection.delete(id);

        await runAction(id, 'delete', () => transaction.isPersisted.promise);
    };

    const renameGroup = async (id: string, key: string) => {
        const normalizedKey = normalizeCharacterKey(key);
        const original = groups.collection.get(id);

        if (!normalizedKey || !original) {
            return null;
        }

        if (normalizeCharacterKey(original.key) === normalizedKey) {
            return toDomainCollectionValue(original);
        }

        if (hasGroupKeyCollision(normalizedKey, id)) {
            return null;
        }

        if (await hasCharacterKeyCollision(normalizedKey)
            || hasGroupKeyCollision(normalizedKey, id)) {
            return null;
        }

        return updateGroup(id, {key: normalizedKey}, 'key');
    };

    return {
        groupsCollection: groups.collection,
        groupsStatus: groups.status,
        actionStatus,
        createGroup,
        deleteGroup,
        renameGroup,
        setGroupColor: (id: string, colorHex: string | null) => {
            return updateGroup(id, {colorHex}, 'colorHex');
        },
        replaceGroupMembers: (id: string, memberIds: string[]) => {
            return updateGroup(id, {memberIds: normalizeIds(memberIds)}, 'memberIds');
        },
    };
};

export type ScriptCharacterGroupsStore = ReturnType<typeof createScriptCharacterGroupsStore>;

export const getScriptCharacterGroupsStore = createRepositoryStoreRegistry(
    createScriptCharacterGroupsStore,
);
