import {DOWNLOAD_URL} from '@stagistic/app-routes';
import {CloseIcon, IconButton} from '@stagistic/ui';
import {useState} from 'react';

import styles from './MacAppCard.module.css';
import {
    isMacDesktopBrowser,
    type NavigatorLike,
    readMacAppCardDismissed,
    storeMacAppCardDismissed,
} from './macAppOffer';

type MacAppCardProps = {
    /** Defaults to the real `navigator`; tests inject one. */
    environment?: NavigatorLike,
};

/** Quiet, dismissible offer of the Mac app on the script list. Web app only, on desktop Macs. */
export const MacAppCard = ({environment = window.navigator}: MacAppCardProps) => {
    const [dismissed, setDismissed] = useState(readMacAppCardDismissed);

    if (dismissed || !isMacDesktopBrowser(environment)) {
        return null;
    }

    return (
        <aside className={styles.card} aria-labelledby="mac-app-card-title">
            <div className={styles.body}>
                <h2 id="mac-app-card-title" className={styles.title}>Stagistic for Mac</h2>
                <p className={styles.description}>
                    Automatic backups and a read-only MCP connection.
                </p>
                <a
                    className={styles.link}
                    href={DOWNLOAD_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    Get the Mac app
                </a>
            </div>
            <IconButton
                aria-label="Dismiss Stagistic for Mac"
                size="sm"
                onPress={() => {
                    storeMacAppCardDismissed();
                    setDismissed(true);
                }}
            >
                <CloseIcon aria-hidden="true" />
            </IconButton>
        </aside>
    );
};
