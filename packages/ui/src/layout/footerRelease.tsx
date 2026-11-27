import {createContext, useContext} from 'react';

export interface FooterRelease {
    /** The current Release number, e.g. `0.2.0`. */
    releaseNumber: string,
    onOpenWhatsNew: () => void,
    /** Adds a dot to What's new while the writer has not seen the newest Release. */
    hasUnseenRelease?: boolean,
    /** Set while a newer Release is ready: shows a quiet action. */
    update?: FooterReleaseUpdate,
}

export interface FooterReleaseUpdate {
    /** Plain status text, e.g. `New version is ready.` */
    message: string,
    /** The underlined action after it, e.g. `Click to restart`. */
    actionLabel: string,
    onPress: () => void,
}

const FooterReleaseContext = createContext<FooterRelease | null>(null);

export const FooterReleaseProvider = FooterReleaseContext.Provider;

export const useFooterRelease = () => useContext(FooterReleaseContext);
