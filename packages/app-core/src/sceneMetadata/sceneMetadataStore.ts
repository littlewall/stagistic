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
            insert: record => saveCharacter(record.headingBlockId, record.characterId, {
                note: record.note,
                arcValue: record.arcValue,
                onCard: record.onCard,
            }),
            update: async (_original, modified, changes) => {
                await saveCharacter(modified.headingBlockId, modified.characterId, {
                    ...changes.note !== undefined ? {note: modified.note} : {},
                    ...changes.arcValue !== undefined ? {arcValue: modified.arcValue} : {},
                    ...changes.onCard !== undefined ? {onCard: modified.onCard} : {},
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
    /*
     * The record rules live here, not in the UI. A record holds a note, an arc point and an
     * `onCard` flag: true when the user put the character on the card (or set an arc point),
     * false for a first note on a character the script already places.
     */
    const insertRecord = async (
        key: string,
        record: Pick<ScriptSceneCharacter, 'headingBlockId' | 'characterId' | 'note' | 'arcValue' | 'onCard'>,
    ) => {
        const now = Date.now();

        const transaction = characters.collection.insert({
            scriptId,
            ...record,
            // Placeholders until the durable row returns: confirmation compares that row, not these.
            createdAt: now,
            updatedAt: now,
        });

        await transaction.isPersisted.promise;

        return durableCharacter(key);
    };
    const updateRecord = async (key: string, change: Partial<Pick<ScriptSceneCharacter, 'note' | 'arcValue' | 'onCard'>>) => {
        const transaction = characters.collection.update(key, draft => {
            Object.assign(draft, change);
        });

        await transaction.isPersisted.promise;

        return durableCharacter(key);
    };
    const deleteRecord = async (key: string) => {
        const transaction = characters.collection.delete(key);

        await transaction.isPersisted.promise;
    };
    /** Explicit additions join the card; notes join it only without script evidence. */
    const putSceneCharacter = async (headingBlockId: string, characterId: string, input: SceneCharacterInput, hasEvidence = false) => {
        const key = sceneCharacterKey(headingBlockId, characterId);
        const existing = characters.collection.get(key);
        const note = input.note === undefined ? undefined : normalizeNote(input.note);
        const onCard = note !== undefined && hasEvidence ? existing?.onCard ?? false : true;

        if (!existing) {
            return insertRecord(key, {
                headingBlockId,
                characterId,
                note: note ?? null,
                arcValue: input.arcValue ?? null,
                onCard,
            });
        }

        if (note === undefined && input.arcValue === undefined && existing.onCard) {
            return Promise.resolve(toDomainCollectionValue(existing));
        }

        return updateRecord(key, {
            onCard,
            ...note !== undefined ? {note} : {},
            ...input.arcValue !== undefined ? {arcValue: input.arcValue} : {},
        });
    };
    /** "Remove from card": always deletes the record, arc value included, so no point survives off the card. */
    const removeSceneCharacter = async (headingBlockId: string, characterId: string) => {
        const key = sceneCharacterKey(headingBlockId, characterId);

        if (!characters.collection.has(key)) return Promise.resolve();

        await deleteRecord(key);
    };
    /** An arc point puts the character on the card: a new record is created on it, an existing one is moved onto it. */
    const setArcPoint = async (headingBlockId: string, characterId: string, value: number) => {
        const key = sceneCharacterKey(headingBlockId, characterId);

        if (!characters.collection.has(key)) {
            return insertRecord(key, {
                headingBlockId,
                characterId,
                note: null,
                arcValue: value,
                onCard: true,
            });
        }

        return updateRecord(key, {arcValue: value, onCard: true});
    };
    /**
     * Removes the point. A record with a note keeps the note and stays on the card (the note is
     * a baseline point); one without a note is deleted, so a hand-added character also leaves the card.
     */
    const removeArcPoint = async (headingBlockId: string, characterId: string) => {
        const key = sceneCharacterKey(headingBlockId, characterId);
        const existing = characters.collection.get(key);

        if (!existing) return;

        if (!existing.note) {
            await deleteRecord(key);

            return;
        }

        await updateRecord(key, {arcValue: null, onCard: true});
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
        setArcPoint,
        removeArcPoint,
        updateSceneSynopsis,
    };
};

export const getSceneMetadataStore = createRepositoryStoreRegistry(createSceneMetadataStore);
