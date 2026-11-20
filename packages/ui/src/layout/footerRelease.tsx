import {createContext, useContext} from 'react';

export interface FooterRelease {
    /** The current Release number, e.g. `0.2.0`. */
    releaseNumber: string,
    onOpenWhatsNew: () => void,
    /** Adds a dot to What's new while the writer has not seen the newest Release. */
    hasUnseenRelease?: boolean,
    /** Set while a newer build is deployed: shows a quiet reload with its own dot, which opening What's new does not clear. */
    onReload?: () => void,
}

const FooterReleaseContext = createContext<FooterRelease | null>(null);

export const FooterReleaseProvider = FooterReleaseContext.Provider;

export const useFooterRelease = () => useContext(FooterReleaseContext);
