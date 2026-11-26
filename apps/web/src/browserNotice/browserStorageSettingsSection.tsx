import {type AppSettingsSection, DOWNLOAD_URL} from '@stagistic/app-routes';
import {BrowserDataNotice} from '@stagistic/ui';

import styles from './browserStorageSettingsSection.module.css';

/**
 * App settings tab with the browser-storage information the first-visit notice shows.
 * Web only: the desktop app stores files on disk, so it does not pass this section.
 */
export const browserStorageSettingsSection: AppSettingsSection = {
    id: 'storage',
    label: 'Storage',
    content: (
        <div className={styles.content}>
            <BrowserDataNotice />
            <p className={styles.macApp}>
                {'Want automatic backups? '}
                <a
                    className={styles.macAppLink}
                    href={DOWNLOAD_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    Get the Mac app
                </a>
            </p>
        </div>
    ),
};
