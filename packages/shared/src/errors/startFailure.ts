/*
 * Why the local database could not start. Thrown by the database layer and
 * classified by the app bootstrap, which renders one screen per kind.
 * `older-version-running` is raised when an older build still holds the
 * database; the other kinds map to a failure while opening or migrating it.
 */
export type StartFailureKind =
    | 'older-version-running'
    | 'database-newer-than-app'
    | 'migration-failed'
    | 'unknown';

const START_FAILURE_KINDS: readonly StartFailureKind[] = [
    'older-version-running',
    'database-newer-than-app',
    'migration-failed',
    'unknown',
];

/** Plain data for a failure; survives a trip across a worker boundary. */
export interface StartFailureInfo {
    kind: StartFailureKind,
    message: string,
    /** Migration the failure refers to, when there is one. */
    migrationId?: string,
}

interface StartFailureErrorOptions extends ErrorOptions {
    migrationId?: string,
}

export class StartFailureError extends Error {
    readonly kind: StartFailureKind;

    readonly migrationId?: string;

    constructor(kind: StartFailureKind, message: string, options: StartFailureErrorOptions = {}) {
        super(message, options);
        this.name = 'StartFailureError';
        this.kind = kind;
        this.migrationId = options.migrationId;
    }
}

export const isStartFailureKind = (value: unknown): value is StartFailureKind => {
    return START_FAILURE_KINDS.some(kind => kind === value);
};

/** Typed failures keep their kind; anything else is `unknown`. */
export const describeStartFailure = (error: unknown): StartFailureInfo => {
    if (error instanceof StartFailureError) {
        return {
            kind: error.kind,
            message: error.message,
            ...error.migrationId ? {migrationId: error.migrationId} : {},
        };
    }

    return {
        kind: 'unknown',
        message: error instanceof Error ? error.message : String(error),
    };
};

export const startFailureFromInfo = (info: StartFailureInfo): StartFailureError => {
    return new StartFailureError(info.kind, info.message, {migrationId: info.migrationId});
};

