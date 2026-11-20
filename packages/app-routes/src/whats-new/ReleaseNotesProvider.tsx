import {
    announceReleases,
    compareReleaseNumbers,
    isReleaseNumber,
} from '@stagistic/release-notes';
import {
    FooterReleaseProvider,
    WhatsNewDialog,
    type WhatsNewNote,
} from '@stagistic/ui';
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import {useReleaseUpdate} from '../updates/ReleaseUpdateProvider';
import {createLastSeenReleaseStore} from './lastSeenRelease';
import {type ReleaseSource, toWhatsNewReleases} from './toWhatsNewReleases';

type WhatsNewController = {
    isOpen: boolean,
    open: () => void,
    close: () => void,
};

type ReleaseHighlights = {
    /** The Highlights to announce, breaking ones first; null when there is nothing to announce. */
    notes: readonly WhatsNewNote[] | null,
    /** Records the current Release as seen, so the announcement is not repeated. */
    markSeen: () => void,
    /** Opens the full What's new dialog. */
    openWhatsNew: () => void,
};

const WhatsNewContext = createContext<WhatsNewController | null>(null);
const ReleaseHighlightsContext = createContext<ReleaseHighlights | null>(null);

/** Opens or closes What's new from anywhere under the provider, e.g. a Release popup. */
export const useWhatsNew = () => {
    const context = useContext(WhatsNewContext);

    if (!context) {
        throw new Error('useWhatsNew must be used within ReleaseNotesProvider');
    }

    return context;
};

/** Null outside the provider, so screens that announce Highlights also render without one. */
export const useReleaseHighlights = () => useContext(ReleaseHighlightsContext);

interface ReleaseNotesProviderProps {
    children: ReactNode,
    /** The current Release number. */
    releaseNumber: string,
    /** Every finished Release, newest first. */
    releases: readonly ReleaseSource[],
    /**
     * Whether the writer has a script; undefined while the script list is still unknown. Nothing is
     * announced, and nothing recorded, until it is known.
     */
    hasScripts?: boolean,
}

export const ReleaseNotesProvider = ({
    children,
    releaseNumber,
    releases,
    hasScripts,
}: ReleaseNotesProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [lastSeenStore] = useState(createLastSeenReleaseStore);
    const lastSeenRelease = useSyncExternalStore(lastSeenStore.subscribe, lastSeenStore.read, () => undefined);
    const announcement = useMemo(() => announceReleases({
        currentRelease: releaseNumber,
        releases,
        lastSeenRelease,
        hasScripts,
    }), [
        releaseNumber,
        releases,
        lastSeenRelease,
        hasScripts,
    ]);
    const markSeen = useCallback(() => {
        const current = lastSeenStore.read();

        // Never move the marker back: another tab may run a newer build.
        if (current === undefined || (current !== null && isReleaseNumber(current) && compareReleaseNumbers(current, releaseNumber) >= 0)) {
            return;
        }

        lastSeenStore.write(releaseNumber);
    }, [lastSeenStore, releaseNumber]);

    useEffect(() => {
        if (announcement.markSeen) {
            markSeen();
        }
    }, [announcement.markSeen, markSeen]);

    const whatsNewReleases = useMemo(() => toWhatsNewReleases(releases), [releases]);
    const open = useCallback(() => {
        markSeen();
        setIsOpen(true);
    }, [markSeen]);
    const close = useCallback(() => setIsOpen(false), []);
    const controller = useMemo<WhatsNewController>(() => ({
        isOpen,
        open,
        close,
    }), [
        isOpen,
        open,
        close,
    ]);
    const highlights = useMemo<ReleaseHighlights>(() => {
        if (!announcement.popup) {
            return {
                notes: null,
                markSeen,
                openWhatsNew: open,
            };
        }

        const notes = toWhatsNewReleases(announcement.releases).flatMap(release => release.notes);

        return {
            notes: [...notes.filter(note => note.breaking), ...notes.filter(note => !note.breaking)],
            markSeen,
            openWhatsNew: open,
        };
    }, [
        announcement,
        markSeen,
        open,
    ]);
    const update = useReleaseUpdate();
    const reloadForUpdate = update?.availableRelease ? update.reload : undefined;
    const footerRelease = useMemo(() => ({
        releaseNumber,
        hasUnseenRelease: announcement.hasUnseenRelease,
        onOpenWhatsNew: open,
        onReload: reloadForUpdate,
    }), [
        releaseNumber,
        announcement.hasUnseenRelease,
        open,
        reloadForUpdate,
    ]);

    return (
        <WhatsNewContext.Provider value={controller}>
            <ReleaseHighlightsContext.Provider value={highlights}>
                <FooterReleaseProvider value={footerRelease}>
                    {children}
                </FooterReleaseProvider>
            </ReleaseHighlightsContext.Provider>
            <WhatsNewDialog
                isOpen={isOpen}
                releases={whatsNewReleases}
                onClose={close}
            />
        </WhatsNewContext.Provider>
    );
};
