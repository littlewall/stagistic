import {getCharacterColor} from '@stagistic/editor-ui';
import {
    CHARACTER_COLOR_SATURATION_OPTIONS,
    clampCharacterColorSaturation,
} from '@stagistic/script-core';
import {useMemo} from 'react';

import styles from '../../ScriptEditorRoute.module.css';
import {
    SettingsSelect,
    type SettingsSelectOption,
} from './SettingsSelect';

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
        <div className={styles.panelStack}>
            <h3 className={styles.panelTitle}>Visual Preferences</h3>
            <div className={styles.settingsField}>
                <label className={styles.fieldLabel} htmlFor="character-color-saturation">
                    Character Color Saturation
                </label>
                <div className={styles.visualPreferencesInlineRow}>
                    <div className={styles.visualSelectCompact}>
                        <SettingsSelect
                            id="character-color-saturation"
                            value={normalizedSaturation}
                            options={SATURATION_OPTIONS}
                            ariaLabel="Character color saturation"
                            onChange={value => {
                                onUpdateCharacterColorSaturation(clampCharacterColorSaturation(Number(value)));
                            }}
                        />
                    </div>
                    <span className={styles.visualPreviewPrefix}>Preview:</span>
                    <div className={styles.visualPreviewDots}>
                        {previewColors.map((color, index) => (
                            <span
                                key={`${PREVIEW_CHARACTER_KEYS[index]}-${color}`}
                                className={styles.visualPreviewDot}
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
