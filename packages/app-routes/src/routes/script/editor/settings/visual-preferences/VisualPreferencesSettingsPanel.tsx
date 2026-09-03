import {getCharacterColor} from '@stagistic/editor';
import {
    CHARACTER_COLOR_SATURATION_OPTIONS,
    clampCharacterColorSaturation,
} from '@stagistic/script';
import {
    formControlStyles,
    FormSelect,
    type FormSelectOption,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';
import {useMemo} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './VisualPreferencesSettingsPanel.module.css';

const PREVIEW_CHARACTER_KEYS = [
    'alex',
    'sam',
    'liam',
    'zoe',
    'nora',
] as const;

const SATURATION_OPTIONS: FormSelectOption[] = CHARACTER_COLOR_SATURATION_OPTIONS.map(value => ({
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
        <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
            <PanelHeader level={3} title="Visual preferences" />
            <div className={formControlStyles.field}>
                <label className={formControlStyles.label} htmlFor="character-color-saturation">
                    Character Color Saturation
                </label>
                <div className={styles.inlineRow}>
                    <FormSelect
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
        </SettingsGroup>
    );
};
