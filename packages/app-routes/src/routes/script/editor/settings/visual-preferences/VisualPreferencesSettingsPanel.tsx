import {getCharacterColor} from '@stagistic/editor';
import {
    CHARACTER_COLOR_SATURATION_OPTIONS,
    clampCharacterColorSaturation,
} from '@stagistic/script';
import {useMemo} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import {
    SettingsSelect,
    type SettingsSelectOption,
} from '../SettingsSelect';
import sharedStyles from '../shared.module.css';
import styles from './VisualPreferencesSettingsPanel.module.css';

const PREVIEW_CHARACTER_KEYS = [
    'alex',
    'sam',
    'liam',
    'zoe',
    'nora',
] as const;

const SATURATION_OPTIONS: SettingsSelectOption[] = CHARACTER_COLOR_SATURATION_OPTIONS.map(value => ({
    value,
    label: `${value}%`,
}));

interface VisualPreferencesSettingsPanelProps {
    characterColorSaturation: number,
    onUpdateCharacterColorSaturation: (value: number) => void,
}

export const VisualPreferencesSettingsPanel = ({
    characterColorSaturation,
    onUpdateCharacterColorSaturation,
}: VisualPreferencesSettingsPanelProps) => {
    const normalizedSaturation = clampCharacterColorSaturation(characterColorSaturation);
    const previewColors = useMemo(
        () => PREVIEW_CHARACTER_KEYS.map(key => getCharacterColor(key, normalizedSaturation)),
        [normalizedSaturation],
    );

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Visual Preferences</h3>
            <div className={sharedStyles.settingsField}>
                <label className={sharedStyles.fieldLabel} htmlFor="character-color-saturation">
                    Character Color Saturation
                </label>
                <div className={styles.inlineRow}>
                    <SettingsSelect
                        id="character-color-saturation"
                        value={normalizedSaturation}
                        options={SATURATION_OPTIONS}
                        ariaLabel="Character color saturation"
                        className={styles.selectCompact}
                        onChange={value => {
                            onUpdateCharacterColorSaturation(clampCharacterColorSaturation(Number(value)));
                        }}
                    />
                    <span className={styles.previewPrefix}>Preview:</span>
                    <div className={styles.previewDots}>
                        {previewColors.map((color, index) => (
                            <span
                                key={`${PREVIEW_CHARACTER_KEYS[index]}-${color}`}
                                className={styles.previewDot}
                                style={{background: color}}
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
