import {PANEL_DESCRIPTIONS} from './constants';
import styles from './ScriptEditorSettingsPanel.module.css';

interface PlaceholderSettingsPanelProps {
    panelId: string,
}

export const PlaceholderSettingsPanel = ({panelId}: PlaceholderSettingsPanelProps) => {
    const panel = PANEL_DESCRIPTIONS[panelId];

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
