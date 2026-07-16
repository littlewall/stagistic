import type {
    CreateScriptCueInput,
    ScriptCue,
    ScriptRepository,
    UpdateScriptCueInput,
} from '@stagistic/db';

import {
    createReactiveCollection,
    createRepositoryStoreRegistry,
    toDomainCollectionValue,
} from '../collections';

export const createScriptCuesStore = (
    repository: ScriptRepository,
    scriptId: string,
) => {
    const source = repository.getScriptCuesSource(scriptId);
    const cues = createReactiveCollection<ScriptCue, string>({
        id: `script-cues:${scriptId}`,
        source,
        getKey: cue => cue.id,
        handlers: {
            insert: async cue => {
                const created = await repository.createScriptCueWithId(scriptId, {
                    id: cue.id,
                    title: cue.title,
                    kind: cue.kind === 'instrumental' ? 'instrumental' : 'song',
                    timestamp: cue.createdAt,
                });

                if (!created) {
                    throw new Error('The cue could not be created');
                }
            },
            update: async (original, modified, changes) => {
                if (!('title' in changes) && !('kind' in changes)) {
                    return;
                }

                const updated = await repository.updateScriptCue(scriptId, original.id, {
                    title: modified.title,
                    kind: modified.kind === 'instrumental' ? 'instrumental' : 'song',
                });

                if (!updated) {
                    throw new Error('The cue could not be updated');
                }
            },
            delete: cue => repository.deleteScriptCue(scriptId, cue.id),
        },
    });

    const createCue = async (input: CreateScriptCueInput) => {
        const title = input.title.trim();

        if (!title) {
            return null;
        }

        const id = repository.allocateScriptCueId();
        const timestamp = Date.now();
        const transaction = cues.collection.insert({
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

        const cue = cues.collection.get(id);

        return cue ? toDomainCollectionValue(cue) : null;
    };

    const updateCue = async (cueId: string, input: UpdateScriptCueInput) => {
        const title = input.title.trim();

        if (!cueId || !title || !cues.collection.has(cueId)) {
            return null;
        }

        const transaction = cues.collection.update(cueId, draft => {
            draft.title = title;
            draft.kind = input.kind;
        });

        await transaction.isPersisted.promise;

        const cue = cues.collection.get(cueId);

        return cue ? toDomainCollectionValue(cue) : null;
    };

    const deleteCue = async (cueId: string) => {
        if (!cueId || !cues.collection.has(cueId)) {
            return;
        }

        const transaction = cues.collection.delete(cueId);

        await transaction.isPersisted.promise;
    };

    return {
        collection: cues.collection,
        status: cues.status,
        createCue,
        updateCue,
        deleteCue,
    };
};

export type ScriptCuesStore = ReturnType<typeof createScriptCuesStore>;

export const getScriptCuesStore = createRepositoryStoreRegistry(createScriptCuesStore);
