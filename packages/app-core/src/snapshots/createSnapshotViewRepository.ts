import {
    createLocalPgliteRepository,
    createReadOnlyScriptRepository,
    createReadThroughFileStorage,
    type FileStorage,
    type LocalDb,
    type ScriptRepository,
} from '@stagistic/db';
import type {StepkgSnapshot} from '@stagistic/stepkg';

import {mapStepkgSnapshotToPackageWrite} from '../stepkg/mapStepkgSnapshotToPackageWrite';

export interface SnapshotViewRepositoryDeps {
    /** A fresh, empty, migrated in-memory database private to this tab. */
    createLocalDb: () => Promise<LocalDb>,
    /** Live file storage; only read through, never written. */
    fileStorage: FileStorage,
}

export interface SnapshotViewRepository {
    /** Load a stored script state and return a read-only repository over it. */
    open: (snapshot: StepkgSnapshot) => Promise<ScriptRepository>,
}

/**
 * Viewing a stored script state reuses the whole app (editor, panels,
 * attribute manager, export) by loading the state into its own in-memory
 * database. One database is created lazily and reused; each open replaces
 * the previously loaded state. Attachments keep pointing at the live blobs.
 */
export const createSnapshotViewRepository = ({createLocalDb, fileStorage}: SnapshotViewRepositoryDeps): SnapshotViewRepository => {
    let repositoryPromise: Promise<ScriptRepository> | null = null;
    let queue: Promise<unknown> = Promise.resolve();

    const getRepository = () => {
        repositoryPromise ??= createLocalDb().then(db => createLocalPgliteRepository({
            getLocalDb: () => Promise.resolve(db),
            syncToFs: () => Promise.resolve(),
            fileStorage: createReadThroughFileStorage(fileStorage),
        }));

        return repositoryPromise;
    };

    const load = async (snapshot: StepkgSnapshot) => {
        const repository = await getRepository();

        for (const script of await repository.listScripts()) {
            await repository.deleteScript(script.id);
        }

        await repository.createScriptFromPackage(mapStepkgSnapshotToPackageWrite(snapshot, 'existing-storage-keys'));

        return createReadOnlyScriptRepository(repository);
    };

    return {
        open: snapshot => {
            const opened = queue.then(() => load(snapshot));

            queue = opened.catch(() => undefined);

            return opened;
        },
    };
};
