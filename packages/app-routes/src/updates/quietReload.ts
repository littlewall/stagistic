const ATTEMPTED_KEY = 'stagistic.quietReloadAttempted';

export interface QuietReloadConditions {
    /** Text the database has not received yet, in a document or a draft. */
    hasUnsavedWork: boolean,
    hasOpenDialog: boolean,
    isHandoverIdle: boolean,
    hasRuntimeFileFailure: boolean,
}

type AttemptStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface QuietReloadAttempt {
    /** The newer Release that was found. */
    release: string,
    conditions: QuietReloadConditions,
    /** Per tab, so the attempt survives the reload itself. Null when the browser offers none. */
    storage: AttemptStorage | null,
    reload: () => void,
}

const isQuiet = ({
    hasUnsavedWork,
    hasOpenDialog,
    isHandoverIdle,
    hasRuntimeFileFailure,
}: QuietReloadConditions) => !hasUnsavedWork && !hasOpenDialog && isHandoverIdle && !hasRuntimeFileFailure;

/**
 * Reloads to pick up a newer Release, once per Release in this tab. When the server keeps
 * reporting the same Release after the reload (a stale cache), the second attempt does nothing
 * instead of looping. Without a way to remember the attempt it never reloads.
 */
export const attemptQuietReload = ({
    release,
    conditions,
    storage,
    reload,
}: QuietReloadAttempt): boolean => {
    if (!isQuiet(conditions)) {
        return false;
    }

    try {
        if (!storage || storage.getItem(ATTEMPTED_KEY) === release) {
            return false;
        }

        storage.setItem(ATTEMPTED_KEY, release);
    } catch {
        return false;
    }

    reload();

    return true;
};
