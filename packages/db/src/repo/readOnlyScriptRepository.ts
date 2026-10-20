import type {FileStorage} from '../storage/fileStorage';
import type {ScriptRepository} from '../types/scriptRepository';

export class ReadOnlyScriptRepositoryError extends Error {
    constructor(operation: string) {
        super(`Cannot ${operation}: this script state is read-only.`);
        this.name = 'ReadOnlyScriptRepositoryError';
    }
}

const READ_OPERATION = /^(?:get|list|load|allocate)/u;

/**
 * Wrap a repository so every mutation rejects. Reads, id allocation and
 * reactive sources pass through. This is the safety net behind the read-only
 * UI of a stored script state; the UI must not reach these errors.
 */
export const createReadOnlyScriptRepository = (repository: ScriptRepository): ScriptRepository => {
    const entries = Object.entries(repository).map(([key, value]) => {
        if (typeof value !== 'function' || READ_OPERATION.test(key)) {
            return [key, value] as const;
        }

        return [key, () => Promise.reject(new ReadOnlyScriptRepositoryError(key))] as const;
    });

    return Object.fromEntries(entries) as unknown as ScriptRepository;
};

/** Reads blobs from the live storage; never writes or deletes them. */
export const createReadThroughFileStorage = (fileStorage: FileStorage): FileStorage => ({
    save: () => Promise.reject(new ReadOnlyScriptRepositoryError('save a file')),
    get: key => fileStorage.get(key),
    delete: () => Promise.resolve(),
    listKeys: () => Promise.resolve([]),
});
