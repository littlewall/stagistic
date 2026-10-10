import type {ScriptRepository, ScriptSnapshot} from '@stagistic/db';

import {createReactiveCollection, createRepositoryStoreRegistry} from '../collections';

/*
 * Read model only. Snapshots change through dedicated repository calls
 * (create/update/delete/restore) and the reactive source picks the result up.
 */
const createScriptSnapshotsStore = (repository: ScriptRepository, scriptId: string) => {
    const {status, confirmed} = createReactiveCollection<ScriptSnapshot, string>({
        id: `script-snapshots:${scriptId}`,
        source: repository.getScriptSnapshotsSource(scriptId),
        getKey: snapshot => snapshot.id,
    });

    return {status, confirmed};
};

export const getScriptSnapshotsStore = createRepositoryStoreRegistry(createScriptSnapshotsStore);
