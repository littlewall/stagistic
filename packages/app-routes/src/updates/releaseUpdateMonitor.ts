import {compareReleaseNumbers, parseVersionManifest} from '@stagistic/release-notes';

const THIRTY_MINUTES_MS = 30 * 60_000;
const MIN_GAP_MS = 60_000;
const JSON_CONTENT_TYPE = /^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i;

export interface ReleaseUpdateMonitorOptions {
    /** The Release number this tab was built as. */
    currentRelease: string,
    /** Where the build's `version.json` is served. */
    versionUrl?: string,
    fetch?: typeof fetch,
    /** Checked whenever this target gains focus. */
    focusTarget?: EventTarget,
    isOnline?: () => boolean,
    intervalMs?: number,
    /** No two checks start closer together than this, however often the window is focused. */
    minGapMs?: number,
    now?: () => number,
}

export type ReleaseUpdateMonitor = ReturnType<typeof createReleaseUpdateMonitor>;

/**
 * Learns whether a newer Release than this tab's is deployed. Checks the build's `version.json`
 * when the window gains focus and every 30 minutes. Whatever is not a valid manifest (the host's
 * HTML fallback for a missing file, a bad status or shape, a network failure) is ignored without a
 * trace: a failed check only means no news.
 */
export const createReleaseUpdateMonitor = ({
    currentRelease,
    versionUrl = '/version.json',
    fetch: fetchManifest = (...args) => fetch(...args),
    focusTarget = window,
    isOnline = () => navigator.onLine,
    intervalMs = THIRTY_MINUTES_MS,
    minGapMs = MIN_GAP_MS,
    now = () => Date.now(),
}: ReleaseUpdateMonitorOptions) => {
    const listeners = new Set<() => void>();
    let availableRelease: string | null = null;
    let availableDbGeneration: string | null = null;
    let lastCheckAt: number | null = null;
    let isChecking = false;

    const read = async (): Promise<{release: string, dbGeneration: string} | null> => {
        const response = await fetchManifest(versionUrl, {cache: 'no-store'});

        if (!response.ok || !JSON_CONTENT_TYPE.test(response.headers.get('content-type') ?? '')) {
            return null;
        }

        return parseVersionManifest(await response.text());
    };

    const check = async () => {
        if (isChecking || !isOnline() || (lastCheckAt !== null && now() - lastCheckAt < minGapMs)) {
            return;
        }

        isChecking = true;
        lastCheckAt = now();

        try {
            const manifest = await read();
            const isNewer = manifest !== null
                && compareReleaseNumbers(manifest.release, availableRelease ?? currentRelease) > 0;

            if (isNewer) {
                availableRelease = manifest.release;
                availableDbGeneration = manifest.dbGeneration;
                listeners.forEach(listener => listener());
            }
        } catch {
            // Offline, blocked or malformed: no news.
        } finally {
            isChecking = false;
        }
    };

    return {
        /** The newest Release known to be deployed, when it is newer than this tab's. */
        getAvailableRelease: () => availableRelease,
        /** The database generation of that Release, when one was found. */
        getAvailableDbGeneration: () => availableDbGeneration,
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        /** Begins watching; returns the function that stops it. */
        start: () => {
            const handleFocus = () => void check();
            const timer = setInterval(() => void check(), intervalMs);

            focusTarget.addEventListener('focus', handleFocus);

            return () => {
                clearInterval(timer);
                focusTarget.removeEventListener('focus', handleFocus);
            };
        },
    };
};
