import type {
    ScriptAct,
    ScriptBlock,
    ScriptBlockCharacterRef,
    ScriptCharacterRef,
    ScriptLocation,
    ScriptScene,
} from '@stagistic/db';
import {
    type Collection,
    createCollection,
    localOnlyCollectionOptions,
} from '@tanstack/react-db';

import type {ScriptStateCollections} from './types';

const createBlocksCollection = () => createCollection(
    localOnlyCollectionOptions<ScriptBlock, string>({
        id: 'script-state.blocks',
        getKey: row => row.id,
        initialData: [],
        syncMode: 'eager',
    }),
);

const createScenesCollection = () => createCollection(
    localOnlyCollectionOptions<ScriptScene, string>({
        id: 'script-state.scenes',
        getKey: row => row.id,
        initialData: [],
        syncMode: 'eager',
    }),
);

const createActsCollection = () => createCollection(
    localOnlyCollectionOptions<ScriptAct, string>({
        id: 'script-state.acts',
        getKey: row => row.id,
        initialData: [],
        syncMode: 'eager',
    }),
);

const createLocationsCollection = () => createCollection(
    localOnlyCollectionOptions<ScriptLocation, string>({
        id: 'script-state.locations',
        getKey: row => row.id,
        initialData: [],
        syncMode: 'eager',
    }),
);

const createCharactersCollection = () => createCollection(
    localOnlyCollectionOptions<ScriptCharacterRef, string>({
        id: 'script-state.characters',
        getKey: row => row.id,
        initialData: [],
        syncMode: 'eager',
    }),
);

const toBlockCharacterRefKey = (row: Pick<ScriptBlockCharacterRef, 'blockId' | 'characterKey'>) => {
    return `${row.blockId}:${row.characterKey}`;
};

const createBlockCharacterRefsCollection = () => createCollection(
    localOnlyCollectionOptions<ScriptBlockCharacterRef, string>({
        id: 'script-state.block-character-refs',
        getKey: row => toBlockCharacterRefKey(row),
        initialData: [],
        syncMode: 'eager',
    }),
);

const deleteAll = <TRow extends object, TKey extends string | number>(
    collection: Collection<TRow, TKey>,
) => {
    const existingKeys = Array.from(collection.keys());

    if (existingKeys.length === 0) {
        return;
    }

    collection.delete(existingKeys);
};

export const replaceCollectionRows = <TRow extends object, TKey extends string | number>(
    collection: Collection<TRow, TKey>,
    rows: TRow[],
) => {
    deleteAll(collection);

    if (rows.length === 0) {
        return;
    }

    collection.insert(rows);
};

export const syncCollectionRows = <TRow extends object>(
    collection: Collection<TRow, string>,
    nextRows: TRow[],
    getKey: (row: TRow) => string,
    previousRowsById: ReadonlyMap<string, TRow>,
    isEqual: (previous: TRow, next: TRow) => boolean,
) => {
    const nextIds = new Set(nextRows.map(getKey));

    // Delete rows that no longer exist
    const keysToDelete: string[] = [];

    for (const key of previousRowsById.keys()) {
        if (!nextIds.has(key)) {
            keysToDelete.push(key);
        }
    }

    if (keysToDelete.length > 0) {
        collection.delete(keysToDelete);
    }

    // Insert new rows or update changed rows
    const toInsert: TRow[] = [];

    for (const nextRow of nextRows) {
        const key = getKey(nextRow);
        const previousRow = previousRowsById.get(key);

        if (!previousRow) {
            toInsert.push(nextRow);
        } else if (!isEqual(previousRow, nextRow)) {
            collection.update(key, draft => {
                Object.assign(draft, nextRow);
            });
        }
        // isEqual → skip, no collection mutation
    }

    if (toInsert.length > 0) {
        collection.insert(toInsert);
    }
};

export const createScriptStateCollections = (): ScriptStateCollections => {
    return {
        blocks: createBlocksCollection(),
        scenes: createScenesCollection(),
        acts: createActsCollection(),
        locations: createLocationsCollection(),
        characters: createCharactersCollection(),
        blockCharacterRefs: createBlockCharacterRefsCollection(),
    };
};

export const getBlockCharacterRefKey = toBlockCharacterRefKey;
