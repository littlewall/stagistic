import {
    compareReleaseNumbers,
    isNonPatchRelease,
    isReleaseNumber,
} from './version';

interface AnnouncedNote {
    highlight: boolean,
}

interface AnnouncedRelease {
    release: string,
    notes: readonly AnnouncedNote[],
}

export interface AnnounceReleasesInput<R extends AnnouncedRelease> {
    /** The Release number the app is built as. */
    currentRelease: string,
    /** Finished Releases, any order. */
    releases: readonly R[],
    /**
     * The stored `lastSeenRelease`: `null` when missing, `undefined` when storage cannot be read.
     * A value that is not a Release number counts as missing.
     */
    lastSeenRelease: string | null | undefined,
    /** Whether the writer has a script; `undefined` while that is still unknown. */
    hasScripts: boolean | undefined,
}

export interface ReleaseAnnouncement<R extends AnnouncedRelease> {
    /** Unseen Releases that have a Highlight, newest first, each with only its Highlights. */
    releases: R[],
    /** The Highlights deserve a popup (on the script list). Otherwise only the dot shows. */
    popup: boolean,
    /** Dot on What's new. */
    hasUnseenRelease: boolean,
    /** Nothing is worth showing: record the current Release as seen without telling the writer. */
    markSeen: boolean,
}

const nothing = <R extends AnnouncedRelease>(markSeen = false): ReleaseAnnouncement<R> => ({
    releases: [],
    popup: false,
    hasUnseenRelease: false,
    markSeen,
});

/**
 * Decides what a writer is told about Releases they have not seen.
 *
 * - New writer (no stored Release, no scripts): nothing, the current Release is recorded silently.
 * - Existing writer without a stored Release: every Release counts as unseen.
 * - Skipped Releases merge into one list; only Highlights count.
 * - A patch Release never opens the popup or the dot; patch Highlights are hidden
 *   outside git. Only an unseen non-patch Release with a Highlight shows anything.
 * - Unseen Releases without a Highlight are recorded silently.
 * - A stored Release newer than this build (an older tab or a rollback) shows nothing and is kept.
 */
export const announceReleases = <R extends AnnouncedRelease>({
    currentRelease,
    releases,
    lastSeenRelease,
    hasScripts,
}: AnnounceReleasesInput<R>): ReleaseAnnouncement<R> => {
    if (!isReleaseNumber(currentRelease) || lastSeenRelease === undefined || hasScripts === undefined) {
        return nothing();
    }

    const lastSeen = lastSeenRelease !== null && isReleaseNumber(lastSeenRelease) ? lastSeenRelease : null;

    if (lastSeen === null && !hasScripts) {
        return nothing(true);
    }

    if (lastSeen !== null && compareReleaseNumbers(lastSeen, currentRelease) >= 0) {
        return nothing();
    }

    const unseen = releases
        .filter(release => isReleaseNumber(release.release)
            && isNonPatchRelease(release.release)
            && compareReleaseNumbers(release.release, currentRelease) <= 0
            && (lastSeen === null || compareReleaseNumbers(release.release, lastSeen) > 0))
        .toSorted((a, b) => compareReleaseNumbers(b.release, a.release))
        .map(release => ({...release, notes: release.notes.filter(note => note.highlight)}))
        .filter(release => release.notes.length > 0);

    if (unseen.length === 0) {
        return nothing(true);
    }

    return {
        releases: unseen,
        popup: true,
        hasUnseenRelease: true,
        markSeen: false,
    };
};
