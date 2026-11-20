import {useDatabaseHandover} from '@stagistic/app-core';
import {ReleaseHighlightsDialog, type WhatsNewNote} from '@stagistic/ui';
import {
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';

import {useReleaseHighlights} from './ReleaseNotesProvider';

const subscribeNever = () => () => {};

/** False while a handover to a newer version is under way. */
const useIsHandoverIdle = () => {
    const handover = useDatabaseHandover();

    return useSyncExternalStore(
        handover?.subscribe ?? subscribeNever,
        () => (handover ? handover.getState().status === 'idle' : true),
    );
};

/**
 * Announces the Highlights of Releases the writer has not seen, once. Mount it only on the script
 * list: that is the single place the popup may appear, so it never covers a script.
 */
export const ReleaseHighlightsPopup = () => {
    const highlights = useReleaseHighlights();
    const isHandoverIdle = useIsHandoverIdle();
    const [shown, setShown] = useState<readonly WhatsNewNote[] | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const pending = highlights?.notes ?? null;
    const markSeen = highlights?.markSeen;

    /*
     * Latched during render: once shown, the popup stays until dismissed even though recording it
     * as seen empties `pending`.
     */
    if (pending && isHandoverIdle && !shown) {
        setShown(pending);
        setIsOpen(true);
    }

    useEffect(() => {
        // Seen means shown: recording it now keeps a reload or another tab from repeating it.
        if (shown) {
            markSeen?.();
        }
    }, [shown, markSeen]);

    if (!shown || !highlights) {
        return null;
    }

    return (
        <ReleaseHighlightsDialog
            isOpen={isOpen}
            notes={shown}
            onClose={() => setIsOpen(false)}
            onOpenAllNotes={() => {
                setIsOpen(false);
                highlights.openWhatsNew();
            }}
        />
    );
};
