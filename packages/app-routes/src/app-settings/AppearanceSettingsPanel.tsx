import {
    type AppThemeMode,
    formControlStyles,
    PanelHeader,
    SettingsGroup,
    ToggleButtonGroup,
    type ToggleButtonGroupOption,
} from '@stagistic/ui';

const THEME_MODE_OPTIONS: ToggleButtonGroupOption<AppThemeMode>[] = [
    {value: 'light', label: 'Light'},
    {value: 'dark', label: 'Dark'},
    {value: 'auto', label: 'System'},
];

interface AppearanceSettingsPanelProps {
    themeMode: AppThemeMode,
    onThemeModeChange: (themeMode: AppThemeMode) => void,
}

export const AppearanceSettingsPanel = ({themeMode, onThemeModeChange}: AppearanceSettingsPanelProps) => (
    <SettingsGroup gap="2xl">
        <PanelHeader level={3} title="Appearance" />
        <div className={formControlStyles.field}>
            <span id="app-settings-color-mode" className={formControlStyles.label}>
                Color mode
            </span>
            <ToggleButtonGroup
                ariaLabelledBy="app-settings-color-mode"
                options={THEME_MODE_OPTIONS}
                value={themeMode}
                onChange={onThemeModeChange}
            />
        </div>
    </SettingsGroup>
);
