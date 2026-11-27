import type {ReactNode} from 'react';

import styles from './AppFooter.module.css';
import {useFooterRelease} from './footerRelease';

const FEEDBACK_URL = 'https://feedback.stagistic.com';

type AppFooterProps = {
    /** Centre slot, e.g. the editor's keyboard hints. Empty on other screens. */
    children?: ReactNode,
};

export const AppFooter = ({children}: AppFooterProps) => {
    const release = useFooterRelease();

    return (
        <footer className={styles.footer}>
            <span className={styles.start}>
                {release ? (
                    <>
                        <span>{`Release ${release.releaseNumber}`}</span>
                        <span aria-hidden="true">•</span>
                        <button
                            aria-label={release.hasUnseenRelease ? 'What\'s new, unread' : undefined}
                            className={styles.releaseLink}
                            type="button"
                            onClick={release.onOpenWhatsNew}
                        >
                            What&apos;s new
                            {release.hasUnseenRelease ? <span className={styles.dot} data-unseen-dot="" /> : null}
                        </button>
                        {release.update ? (
                            <>
                                <span aria-hidden="true">•</span>
                                <span>{release.update.message}</span>
                                <button className={styles.releaseLink} type="button" onClick={release.update.onPress}>
                                    {release.update.actionLabel}
                                </button>
                            </>
                        ) : null}
                    </>
                ) : null}
            </span>
            <div className={styles.center}>{children}</div>
            <a
                className={styles.feedbackLink}
                href={FEEDBACK_URL}
                rel="noopener noreferrer"
                target="_blank"
            >
                Feedback & bug reports
            </a>
        </footer>
    );
};
