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

/*
 * The content of a stored state never changes, but its settings may: a
 * version often has to be printed with a corrected title page or a different
 * block layout. These writes reach the view database; the caller saves them
 * back into the snapshot from `onSettingsWrite`.
 */
const SNAPSHOT_SETTINGS_WRITES: ReadonlySet<keyof ScriptRepository> = new Set<keyof ScriptRepository>([
    'saveScriptSettings',
    'deleteScriptSettings',
    'saveTitlePage',
    'deleteTitlePage',
    'renameScriptTitle',
]);

/** Page and scene counts follow the settings; recomputing them is not an edit by itself. */
const SNAPSHOT_DERIVED_WRITES: ReadonlySet<keyof ScriptRepository> = new Set<keyof ScriptRepository>(['saveSummaryMetadata']);

export interface SnapshotViewOptions {
    /** A settings write or, after one, a recomputed summary reached the view database. */
    onSettingsWrite?: () => void,
}

export interface SnapshotViewRepository {
    /** Load a stored script state and return a repository over it that only lets settings change. */
    open: (snapshot: StepkgSnapshot, options?: SnapshotViewOptions) => Promise<ScriptRepository>,
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

    const load = async (snapshot: StepkgSnapshot, {onSettingsWrite}: SnapshotViewOptions = {}) => {
        const repository = await getRepository();

        for (const script of await repository.listScripts()) {
            await repository.deleteScript(script.id);
        }

        await repository.createScriptFromPackage(mapStepkgSnapshotToPackageWrite(snapshot, 'existing-storage-keys'));

        let hasSettingsEdits = false;

        return createReadOnlyScriptRepository(repository, {
            writable: new Set([...SNAPSHOT_SETTINGS_WRITES, ...SNAPSHOT_DERIVED_WRITES]),
            onWrite: operation => {
                hasSettingsEdits ||= SNAPSHOT_SETTINGS_WRITES.has(operation);

                if (hasSettingsEdits) {
                    onSettingsWrite?.();
                }
            },
        });
    };

    return {
        open: (snapshot, options) => {
            const opened = queue.then(() => load(snapshot, options));

            queue = opened.catch(() => undefined);

            return opened;
        },
    };
};
