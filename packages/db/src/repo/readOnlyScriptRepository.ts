import type {FileStorage} from '../storage/fileStorage';
import type {ScriptRepository} from '../types/scriptRepository';

export class ReadOnlyScriptRepositoryError extends Error {
    constructor(operation: string) {
        super(`Cannot ${operation}: this script state is read-only.`);
        this.name = 'ReadOnlyScriptRepositoryError';
    }
}

const READ_OPERATION = /^(?:get|list|load|allocate)/u;

export interface ReadOnlyScriptRepositoryOptions {
    /** Mutations that still pass through, e.g. the settings of a stored state. */
    writable?: ReadonlySet<keyof ScriptRepository>,
    /** Called after a writable mutation resolved. */
    onWrite?: (operation: keyof ScriptRepository) => void,
}

/**
 * Wrap a repository so every mutation rejects, except the listed writable
 * ones. Reads, id allocation and reactive sources pass through. This is the
 * safety net behind the read-only UI of a stored script state; the UI must not
 * reach these errors.
 */
export const createReadOnlyScriptRepository = (
    repository: ScriptRepository,
    {writable, onWrite}: ReadOnlyScriptRepositoryOptions = {},
): ScriptRepository => {
    const entries = Object.entries(repository).map(([key, value]) => {
        if (typeof value !== 'function' || READ_OPERATION.test(key)) {
            return [key, value] as const;
        }

        if (writable?.has(key as keyof ScriptRepository)) {
            return [
                key,
                async (...args: unknown[]) => {
                    const result: unknown = await (value as (...callArgs: unknown[]) => unknown)(...args);

                    onWrite?.(key as keyof ScriptRepository);

                    return result;
                },
            ] as const;
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
