import type {
    CreateScriptMusicInput,
    ScriptMusic,
    ScriptRepository,
    UpdateScriptMusicInput,
} from '@stagistic/db';

import {
    createReactiveCollection,
    createRepositoryStoreRegistry,
    toDomainCollectionValue,
} from '../collections';

export const createScriptMusicStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const source = repository.getScriptMusicSource(scriptId);
    const music = createReactiveCollection<ScriptMusic, string>({
        id: `script-music:${scriptId}`,
        source,
        getKey: music => music.id,
        handlers: {
            insert: async music => {
                const created = await repository.createScriptMusicWithId(scriptId, {
                    id: music.id,
                    title: music.title,
                    kind: music.kind === 'instrumental' ? 'instrumental' : 'song',
                    timestamp: music.createdAt,
                });

                if (!created) {
                    throw new Error('The music could not be created');
                }
            },
            update: async (original, modified, changes) => {
                if (!('title' in changes) && !('kind' in changes)) {
                    return;
                }

                const updated = await repository.updateScriptMusic(scriptId, original.id, {
                    title: modified.title,
                    kind: modified.kind === 'instrumental' ? 'instrumental' : 'song',
                });

                if (!updated) {
                    throw new Error('The music could not be updated');
                }
            },
            delete: music => repository.deleteScriptMusic(scriptId, music.id),
        },
    });

    const createMusic = async (input: CreateScriptMusicInput) => {
        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const id = repository.allocateScriptMusicId();
        const timestamp = Date.now();
        const transaction = music.collection.insert({
            id,
            scriptId,
            sceneNumber: 0,
            indexInScene: 0,
            mode: 'open',
            title,
            kind: input.kind,
            startBlockId: null,
            endBlockId: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        await transaction.isPersisted.promise;

        const createdMusic = music.collection.get(id);

        return createdMusic ? toDomainCollectionValue(createdMusic) : null;
    };

    const updateMusic = async (musicId: string, input: UpdateScriptMusicInput) => {
        const title = input.title.trim();

        if (!musicId || !title || !music.collection.has(musicId)) {
            return null;
        }

        const transaction = music.collection.update(musicId, draft => {
            draft.title = title;
            draft.kind = input.kind;
        });

        await transaction.isPersisted.promise;

        const updatedMusic = music.collection.get(musicId);

        return updatedMusic ? toDomainCollectionValue(updatedMusic) : null;
    };

    const deleteMusic = async (musicId: string) => {
        if (!musicId || !music.collection.has(musicId)) {
            return;
        }

        const transaction = music.collection.delete(musicId);

        await transaction.isPersisted.promise;
    };

    return {
        collection: music.collection,
        status: music.status,
        createMusic,
        updateMusic,
        deleteMusic,
    };
};

export type ScriptMusicStore = ReturnType<typeof createScriptMusicStore>;

export const getScriptMusicStore = createRepositoryStoreRegistry(createScriptMusicStore);
