import type {
    SceneCharacterInput,
    ScriptRepository,
    ScriptSceneCharacter,
    ScriptSceneSynopsis,
} from '@stagistic/db';

import {waitForCharacterCreation} from '../characters/scriptCharacterPersistence';
import {
    createReactiveCollection,
    createRepositoryStoreRegistry,
    toDomainCollectionValue,
} from '../collections';

const sceneCharacterKey = (headingBlockId: string, characterId: string) => JSON.stringify([headingBlockId, characterId]);

const normalizeNote = (note: string | null | undefined) => note?.trim() || null;
const normalizeSynopsis = (synopsis: string | null) => synopsis?.trim() || null;

/*
 * Card records and outlines as reactive collections: the Board answers immediately, the
 * repository write follows in the background, and a rejected write rolls the card back.
 */
const createSceneMetadataStore = (repository: ScriptRepository, scriptId: string) => {
    const saveCharacter = async (headingBlockId: string, characterId: string, input: SceneCharacterInput) => {
        await waitForCharacterCreation(repository, scriptId, characterId);

        const durable = await repository.putSceneCharacter(scriptId, headingBlockId, characterId, input);

        // A missing scene or character is a failed write, not a ghost the Board keeps showing.
        if (!durable) throw new Error('The scene character could not be saved');

        return durable;
    };
    const saveSynopsis = async (record: ScriptSceneSynopsis) => {
        const saved = await repository.updateSceneSynopsis(scriptId, record.headingBlockId, record.synopsis);

        if (!saved) throw new Error('The scene outline could not be saved');
    };

    const characters = createReactiveCollection<ScriptSceneCharacter, string>({
        id: `scene-characters:${scriptId}`,
        source: repository.getScriptSceneCharactersSource(scriptId),
        getKey: row => sceneCharacterKey(row.headingBlockId, row.characterId),
        handlers: {
            // The durable row returns with server timestamps; it is what confirmation compares against.
            insert: record => saveCharacter(record.headingBlockId, record.characterId, {note: record.note, arcValue: record.arcValue}),
            update: async (_original, modified, changes) => {
                await saveCharacter(modified.headingBlockId, modified.characterId, {
                    ...changes.note !== undefined ? {note: modified.note} : {},
                    ...changes.arcValue !== undefined ? {arcValue: modified.arcValue} : {},
                });
            },
            delete: record => repository.removeSceneCharacter(scriptId, record.headingBlockId, record.characterId),
        },
    });
    const synopses = createReactiveCollection<ScriptSceneSynopsis, string>({
        id: `scene-synopses:${scriptId}`,
        source: repository.getScriptSceneSynopsesSource(scriptId),
        getKey: row => row.headingBlockId,
        handlers: {
            // The heading must exist in the scene projection; a missing one fails instead of creating a ghost.
            insert: saveSynopsis,
            update: (_original, modified) => saveSynopsis(modified),
        },
    });

    const durableCharacter = (key: string) => {
        const durable = characters.collection.get(key);

        return durable ? toDomainCollectionValue(durable) : null;
    };
    const putSceneCharacter = async (headingBlockId: string, characterId: string, input: SceneCharacterInput) => {
        const key = sceneCharacterKey(headingBlockId, characterId);
        const existing = characters.collection.get(key);
        const note = input.note === undefined ? undefined : normalizeNote(input.note);

        if (!existing) {
            const now = Date.now();

            const transaction = characters.collection.insert({
                scriptId,
                headingBlockId,
                characterId,
                note: note ?? null,
                arcValue: input.arcValue ?? null,
                // Placeholders until the durable row returns: confirmation compares that row, not these.
                createdAt: now,
                updatedAt: now,
            });

            await transaction.isPersisted.promise;

            return durableCharacter(key);
        }

        if (note === undefined && input.arcValue === undefined) {
            return Promise.resolve(toDomainCollectionValue(existing));
        }

        const transaction = characters.collection.update(key, draft => {
            if (note !== undefined) draft.note = note;

            if (input.arcValue !== undefined) draft.arcValue = input.arcValue;
        });

        await transaction.isPersisted.promise;

        return durableCharacter(key);
    };
    const removeSceneCharacter = async (headingBlockId: string, characterId: string) => {
        const key = sceneCharacterKey(headingBlockId, characterId);

        if (!characters.collection.has(key)) return Promise.resolve();

        const transaction = characters.collection.delete(key);

        await transaction.isPersisted.promise;
    };
    const updateSceneSynopsis = async (headingBlockId: string, synopsis: string | null) => {
        const value = normalizeSynopsis(synopsis);
        const transaction = synopses.collection.has(headingBlockId)
            ? synopses.collection.update(headingBlockId, draft => {
                draft.synopsis = value;
            })
            : synopses.collection.insert({headingBlockId, synopsis: value});

        await transaction.isPersisted.promise;

        return true;
    };

    return {
        characters,
        synopses,
        putSceneCharacter,
        removeSceneCharacter,
        updateSceneSynopsis,
    };
};

export const getSceneMetadataStore = createRepositoryStoreRegistry(createSceneMetadataStore);
