/*
 * The manual MCP executable is a copy made by "prepare". After the app updates,
 * that copy would be the old Release, so it is prepared again on the first start
 * of a new Release, but only for writers who prepared it before.
 */
export interface ReleaseStorage {
    getItem: (key: string) => string | null,
    setItem: (key: string, value: string) => void,
}

const LAST_STARTED_RELEASE_KEY = 'stagistic.desktop.lastStartedRelease';
const MANUAL_PREPARED_KEY = 'stagistic.mcp.manualPrepared';

/** Remembers that the writer prepared a manual MCP executable. */
export const markManualMcpPrepared = (storage: ReleaseStorage) => storage.setItem(MANUAL_PREPARED_KEY, '1');

export type ReprepareOutcome = 'skipped' | 'prepared' | 'failed';

export const reprepareManualMcpOnReleaseChange = async (
    currentRelease: string,
    storage: ReleaseStorage,
    prepare: () => Promise<unknown>,
): Promise<ReprepareOutcome> => {
    const lastStarted = storage.getItem(LAST_STARTED_RELEASE_KEY);

    if (lastStarted === currentRelease) {
        return 'skipped';
    }

    if (lastStarted !== null && storage.getItem(MANUAL_PREPARED_KEY) !== null) {
        try {
            await prepare();
        } catch {
            // Keep the old marker so the next start tries again.
            return 'failed';
        }

        storage.setItem(LAST_STARTED_RELEASE_KEY, currentRelease);

        return 'prepared';
    }

    storage.setItem(LAST_STARTED_RELEASE_KEY, currentRelease);

    return 'skipped';
};
