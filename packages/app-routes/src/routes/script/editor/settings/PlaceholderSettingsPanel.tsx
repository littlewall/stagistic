import styles from '../../ScriptEditorRoute.module.css';
import {SCRIPT_SETTINGS_PANEL_SOURCE} from '../../settings/settingsMenu';
import {panelDescriptions} from './constants';

type PlaceholderSettingsPanelProps = {
    panelId: string,
};

export const PlaceholderSettingsPanel = ({panelId}: PlaceholderSettingsPanelProps) => {
    const panel = panelDescriptions[panelId];

    if (panelId === SCRIPT_SETTINGS_PANEL_SOURCE) {
        return (
            <div className={styles.panelStack}>
                <h3 className={styles.panelTitle}>{panel?.title ?? 'Settings Source'}</h3>
                <p className={styles.panelDescription}>
                    {panel?.description ?? 'Settings are stored in local script config tables.'}
                </p>
                <div className={styles.infoCard}>
                    <span className={styles.infoLabel}>Config namespace</span>
                    <span className={styles.infoValue}>editor</span>
                </div>
            </div>
        );
    }

    if (!panel) {
        return (
            <div className={styles.panelStack}>
                <h3 className={styles.panelTitle}>Settings</h3>
                <p className={styles.panelDescription}>No panel configured for this item yet.</p>
            </div>
        );
    }

    return (
        <div className={styles.panelStack}>
            <h3 className={styles.panelTitle}>{panel.title}</h3>
            <p className={styles.panelDescription}>{panel.description}</p>
            <div className={styles.placeholderCard}>Coming soon</div>
        </div>
    );
};
