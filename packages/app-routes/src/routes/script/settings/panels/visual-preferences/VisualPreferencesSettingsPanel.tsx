import {getCharacterColor} from '@stagistic/editor';
import {
    type CharacterDecoration,
    isCharacterDecoration,
} from '@stagistic/script';
import {
    formControlStyles,
    FormSelect,
    type FormSelectOption,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';
import type {CSSProperties} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './VisualPreferencesSettingsPanel.module.css';

const DECORATION_OPTIONS: FormSelectOption[] = [
    {value: 'underline', label: 'Underline'},
    {value: 'underline-tint', label: 'Underline + tinted names'},
    {value: 'underline-tint-lines', label: 'Underline + tinted names and lines'},
    {value: 'none', label: 'None'},
] satisfies Array<FormSelectOption & {value: CharacterDecoration}>;

const toCharacterColorStyle = (characterKey: string) => ({
    '--preview-character-color': getCharacterColor(characterKey),
}) as CSSProperties;

const ALEX_STYLE = toCharacterColorStyle('alex');
const SAM_STYLE = toCharacterColorStyle('sam');

interface VisualPreferencesSettingsPanelProps {
    characterDecoration: CharacterDecoration,
    onUpdateCharacterDecoration: (value: CharacterDecoration) => void,
}

export const VisualPreferencesSettingsPanel = ({
    characterDecoration,
    onUpdateCharacterDecoration,
}: VisualPreferencesSettingsPanelProps) => (
    <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
        <PanelHeader level={3} title="Visual preferences" />
        <div className={styles.inlineRow}>
            <div className={formControlStyles.field}>
                <label className={formControlStyles.label} htmlFor="character-decoration">
                    Character highlight
                </label>
                <FormSelect
                    id="character-decoration"
                    value={characterDecoration}
                    options={DECORATION_OPTIONS}
                    ariaLabel="Character highlight"
                    width="content"
                    onChange={value => {
                        if (isCharacterDecoration(value)) {
                            onUpdateCharacterDecoration(value);
                        }
                    }}
                />
            </div>
            <div
                className={styles.preview}
                data-character-decoration={characterDecoration}
                data-testid="character-decoration-preview"
                aria-hidden="true"
            >
                <p className={styles.previewStage}>
                    <span className={styles.previewName} style={SAM_STYLE}>SAM</span> enters.
                </p>
                <p className={styles.previewCue}>
                    <span className={styles.previewName} style={ALEX_STYLE}>ALEX</span>
                </p>
                <p className={styles.previewLine} style={ALEX_STYLE}>Where were you?</p>
            </div>
        </div>
    </SettingsGroup>
);
