import {compareReleaseNumbers, isReleaseNumber} from '@stagistic/release-notes';

/** The newest Release this browser has told the writer about. Shared by every tab through `localStorage`. */
export const LAST_SEEN_RELEASE_STORAGE_KEY = 'stagistic.lastSeenRelease';

const getStorage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

/** Records a Release without any provider, e.g. for a test that must not see an announcement. */
export const storeLastSeenRelease = (release: string): boolean => {
    try {
        const storage = getStorage();

        if (!storage) {
            return false;
        }

        storage.setItem(LAST_SEEN_RELEASE_STORAGE_KEY, release);

        return true;
    } catch {
        return false;
    }
};

const isNewer = (candidate: string, than: string | null) => than === null
    || !isReleaseNumber(than)
    || compareReleaseNumbers(candidate, than) > 0;

/**
 * The stored marker as an external store. A value the browser refuses to keep is remembered in
 * memory, so the announcement is not repeated within the session.
 */
export const createLastSeenReleaseStore = () => {
    const listeners = new Set<() => void>();
    let unsaved: string | null = null;

    const notify = () => listeners.forEach(listener => listener());

    /** The stored value: `null` when missing, `undefined` when storage cannot be read. */
    const read = (): string | null | undefined => {
        try {
            const storage = getStorage();

            if (!storage) {
                return undefined;
            }

            const stored = storage.getItem(LAST_SEEN_RELEASE_STORAGE_KEY);

            return unsaved !== null && isNewer(unsaved, stored) ? unsaved : stored;
        } catch {
            return undefined;
        }
    };

    const write = (release: string) => {
        if (!storeLastSeenRelease(release)) {
            unsaved = release;
        }

        notify();
    };

    /** Notifies on writes from this tab and, through the `storage` event, from other tabs. */
    const subscribe = (listener: () => void) => {
        const onStorage = (event: StorageEvent) => {
            if (event.key === null || event.key === LAST_SEEN_RELEASE_STORAGE_KEY) {
                listener();
            }
        };

        listeners.add(listener);
        window.addEventListener('storage', onStorage);

        return () => {
            listeners.delete(listener);
            window.removeEventListener('storage', onStorage);
        };
    };

    return {
        read,
        write,
        subscribe,
    };
};
