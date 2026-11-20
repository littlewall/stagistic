import {beforeAll} from 'vite-plus/test';

/*
 * Test files that share a Vitest session run one after another in one origin:
 * each gets a new iframe but the storage of the one before. What a file leaves
 * behind then breaks a neighbour, depending on the order. Every file starts like
 * a first visit, as it does when run alone.
 *
 * Runs after the previous file's iframe is gone, so its workers are stopping.
 * `blocked` only says they have not finished; the delete stays queued, and a
 * connection that never closes fails this hook.
 */
const deleteDatabase = (name: string) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);

    request.addEventListener('success', () => resolve());
    request.addEventListener('error', () => reject(request.error ?? new Error(`Could not delete ${name}.`)));
});

beforeAll(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    const databases = await indexedDB.databases();

    await Promise.all(databases.flatMap(({name}) => (name ? [deleteDatabase(name)] : [])));
});
