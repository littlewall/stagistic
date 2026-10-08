import {createLocalPgliteRepository, type ScriptRepository} from '@stagistic/db';
import {createSyncEngineClient} from '@stagistic/sync-engine';

import {getLocalDb, syncToFs} from '~db';
import {IndexedDbFileStorage} from '~db/fileStorage';

/** Tab side of the sync engine running in the PGlite leader worker. */
export const documentSync = createSyncEngineClient();

const localRepository = createLocalPgliteRepository({
    getLocalDb,
    syncToFs,
    fileStorage: new IndexedDbFileStorage(),
});

/*
 * Writes that replace a script's projection outside the engine must reach
 * its Y.Doc too, or the next projection would overwrite them.
 */
export const scriptRepository: ScriptRepository = {
    ...localRepository,
    restoreScriptFromPackage: async input => {
        await localRepository.restoreScriptFromPackage(input);
        await documentSync.notifyBodyReplaced(input.script.id);
    },
    deleteScript: async scriptId => {
        await localRepository.deleteScript(scriptId);
        await documentSync.notifyScriptDeleted(scriptId).catch(error => {
            console.error('[sync-engine] could not drop local Y state of a deleted script', error);
        });
    },
};
export type {ScriptRepository} from '@stagistic/db';
