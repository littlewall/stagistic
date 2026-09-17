import type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
    ScriptRepository,
} from '@stagistic/db';
import {normalizeCharacterKey} from '@stagistic/script';

import {
    createReactiveCollection,
    createReactiveCollectionStatusStore,
    toDomainCollectionValue,
} from '../collections';

type CharacterField = 'colorHex' | 'genderKey' | 'outline' | 'voiceType' | 'vocalRangeLow' | 'vocalRangeHigh';

const normalizeGenderLabel = (label: string) => label.trim().replace(/\s+/g, ' ');

export const createScriptCharactersStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const charactersSource = repository.getScriptCharactersSource(scriptId);
    const gendersSource = repository.getScriptCharacterGendersSource(scriptId);
    const actionStatus = createReactiveCollectionStatusStore();
    const characters = createReactiveCollection<ScriptCharacterRef, string>({
        id: `script-characters:${scriptId}`,
        source: charactersSource,
        getKey: character => character.id,
        handlers: {
            insert: async character => {
                const confirmed = await repository.confirmScriptCharacterWithId(scriptId, {
                    id: character.id,
                    key: character.key,
                    colorHex: character.colorHex,
                });

                if (!confirmed) {
                    throw new Error('The character could not be confirmed');
                }
            },
            update: async (original, modified, changes) => {
                const fieldCommands: Partial<Record<CharacterField, () => Promise<unknown>>> = {
                    colorHex: () => repository.setScriptCharacterColor(
                        scriptId,
                        original.id,
                        modified.colorHex,
                    ),
                    genderKey: () => repository.setScriptCharacterGender(
                        scriptId,
                        original.id,
                        modified.genderKey,
                    ),
                    outline: () => repository.setScriptCharacterOutline(
                        scriptId,
                        original.id,
                        modified.outline,
                    ),
                    voiceType: () => repository.setScriptCharacterVoiceType(
                        scriptId,
                        original.id,
                        modified.voiceType,
                    ),
                    /*
                     * Both keys read the current low+high pair and call the same
                     * combined setter, since the range is only ever edited as a pair.
                     * When a single edit changes both bounds at once, this fires twice
                     * with identical (already-current) arguments — harmless, but keeps
                     * the per-changed-field loop below correct for either bound alone.
                     */
                    vocalRangeLow: () => repository.setScriptCharacterVocalRange(
                        scriptId,
                        original.id,
                        modified.vocalRangeLow,
                        modified.vocalRangeHigh,
                    ),
                    vocalRangeHigh: () => repository.setScriptCharacterVocalRange(
                        scriptId,
                        original.id,
                        modified.vocalRangeLow,
                        modified.vocalRangeHigh,
                    ),
                };
                const changedFields = Object.keys(changes).filter(
                    (field): field is CharacterField => field in fieldCommands,
                );

                for (const field of changedFields) {
                    const updated = await fieldCommands[field]?.();

                    if (!updated) {
                        throw new Error(`The character ${field} could not be saved`);
                    }
                }
            },
            delete: character => repository.deleteScriptCharacter(scriptId, character.id),
        },
    });
    const genders = createReactiveCollection<ScriptCharacterGenderOption, string>({
        id: `script-character-genders:${scriptId}`,
        source: gendersSource,
        getKey: option => option.id,
        handlers: {
            insert: async option => {
                const created = await repository.upsertScriptCharacterGenderWithId(scriptId, {
                    id: option.id,
                    label: option.label,
                });

                if (!created) {
                    throw new Error('The gender option could not be created');
                }
            },
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

    const confirmCharacter = async (key: string, colorHex?: string | null) => {
        const normalizedKey = normalizeCharacterKey(key);

        if (!normalizedKey) {
            return null;
        }

        const existing = Array.from(characters.collection.values()).find(character => {
            return normalizeCharacterKey(character.key) === normalizedKey;
        });

        if (existing) {
            return existing;
        }

        const id = repository.allocateScriptCharacterId();
        const transaction = characters.collection.insert({
            id,
            kind: 'character',
            key: normalizedKey,
            colorHex: colorHex ?? null,
            genderKey: null,
            notes: null,
            backstory: null,
            outline: null,
            voiceType: null,
            vocalRangeLow: null,
            vocalRangeHigh: null,
        });

        return runAction(normalizedKey, 'confirm', async () => {
            await transaction.isPersisted.promise;

            const character = characters.collection.get(id);

            return character ? toDomainCollectionValue(character) : null;
        });
    };

    const updateField = async (
        characterId: string,
        field: CharacterField,
        value: string | null,
    ) => {
        if (!characters.collection.has(characterId)) {
            return null;
        }

        const transaction = characters.collection.update(characterId, draft => {
            draft[field] = value;
        });

        return runAction(characterId, field, async () => {
            await transaction.isPersisted.promise;

            const character = characters.collection.get(characterId);

            return character ? toDomainCollectionValue(character) : null;
        });
    };

    const updateVocalRange = async (
        characterId: string,
        vocalRangeLow: string | null,
        vocalRangeHigh: string | null,
    ) => {
        if (!characters.collection.has(characterId)) {
            return null;
        }

        const transaction = characters.collection.update(characterId, draft => {
            draft.vocalRangeLow = vocalRangeLow;
            draft.vocalRangeHigh = vocalRangeHigh;
        });

        return runAction(characterId, 'vocalRangeLow', async () => {
            await transaction.isPersisted.promise;

            const character = characters.collection.get(characterId);

            return character ? toDomainCollectionValue(character) : null;
        });
    };

    const deleteCharacter = async (characterId: string) => {
        if (!characters.collection.has(characterId)) {
            return;
        }

        const transaction = characters.collection.delete(characterId);

        await runAction(characterId, 'delete', () => transaction.isPersisted.promise);
    };

    const renameCharacter = async (characterId: string, nextKey: string) => {
        const normalizedKey = normalizeCharacterKey(nextKey);
        const original = characters.collection.get(characterId);

        if (!characterId || !normalizedKey || !original) {
            return null;
        }

        const renameKeys = [...new Set([original.key, normalizedKey])];

        renameKeys.forEach(key => {
            actionStatus.startMutation({entityKey: key, action: 'renameKey'});
        });

        try {
            const renamed = await runAction(characterId, 'rename', async () => {
                const result = await repository.renameScriptCharacter(
                    scriptId,
                    characterId,
                    normalizedKey,
                );

                if (!result) {
                    throw new Error('The character could not be renamed');
                }

                await charactersSource.refresh();

                return result;
            });

            renameKeys.forEach(key => actionStatus.finishMutation(key, 'renameKey'));

            return renamed;
        } catch (error) {
            const normalizedError = error instanceof Error
                ? error
                : new Error(String(error));

            renameKeys.forEach(key => {
                actionStatus.failMutation(key, 'renameKey', normalizedError);
            });
            throw normalizedError;
        }
    };

    const createGender = async (label: string) => {
        const normalizedLabel = normalizeGenderLabel(label);
        const key = normalizedLabel.toLocaleLowerCase();

        if (!key) {
            return null;
        }

        const existing = Array.from(genders.collection.values()).find(option => option.key === key);

        if (existing) {
            return existing;
        }

        const id = repository.allocateScriptCharacterGenderId();
        const transaction = genders.collection.insert({
            id, key, label: normalizedLabel,
        });

        return runAction(key, 'createGender', async () => {
            await transaction.isPersisted.promise;

            const gender = genders.collection.get(id);

            return gender ? toDomainCollectionValue(gender) : null;
        });
    };

    return {
        charactersCollection: characters.collection,
        gendersCollection: genders.collection,
        charactersStatus: characters.status,
        gendersStatus: genders.status,
        actionStatus,
        confirmCharacter,
        deleteCharacter,
        renameCharacter,
        setCharacterColor: (id: string, value: string | null) => updateField(id, 'colorHex', value),
        setCharacterGender: (id: string, value: string | null) => updateField(id, 'genderKey', value),
        setCharacterOutline: (id: string, value: string | null) => updateField(id, 'outline', value),
        setCharacterVoiceType: (id: string, value: string | null) => updateField(id, 'voiceType', value),
        setCharacterVocalRange: (id: string, low: string | null, high: string | null) => updateVocalRange(
            id,
            low,
            high,
        ),
        createGender,
    };
};

export type ScriptCharactersStore = ReturnType<typeof createScriptCharactersStore>;
