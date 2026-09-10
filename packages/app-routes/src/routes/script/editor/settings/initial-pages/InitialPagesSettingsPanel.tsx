import type {
    CastOrderBy,
    InitialPagesSettings,
    InitialPagesSettingsPatch,
} from '@stagistic/script';
import {
    clsx,
    formControlStyles,
    PanelHeader,
    SettingsGroup,
    ToggleButtonGroup,
    type ToggleButtonGroupOption,
} from '@stagistic/ui';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './InitialPagesSettingsPanel.module.css';

interface InitialPagesSettingsPanelProps {
    settings: InitialPagesSettings,
    onUpdate: (patch: InitialPagesSettingsPatch) => void,
}

const CAST_ORDER_OPTIONS: ToggleButtonGroupOption<CastOrderBy>[] = [
    {
        label: 'Name', value: 'name',
    }, {
        label: 'Appearance', value: 'appearance',
    },
];

type BooleanOption = 'yes' | 'no';

const BOOLEAN_OPTIONS: ToggleButtonGroupOption<BooleanOption>[] = [
    {
        label: 'Yes', value: 'yes',
    }, {
        label: 'No', value: 'no',
    },
];

const toBooleanOption = (value: boolean): BooleanOption => {
    return value ? 'yes' : 'no';
};
const fromBooleanOption = (value: BooleanOption): boolean => value === 'yes';

export const InitialPagesSettingsPanel = ({
    settings,
    onUpdate,
}: InitialPagesSettingsPanelProps) => {
    return (
        <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
            <PanelHeader level={3} title="Initial pages" />
            <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Cast and place</h4>
                <div className={clsx(formControlStyles.flatGrid, styles.flushGrid)}>
                    <div className={formControlStyles.field}>
                        <span id="initial-pages-cast-order" className={formControlStyles.label}>Cast order by</span>
                        <ToggleButtonGroup
                            ariaLabelledBy="initial-pages-cast-order"
                            options={CAST_ORDER_OPTIONS}
                            value={settings.castAndPlace.castOrderBy}
                            onChange={castOrderBy => onUpdate({castAndPlace: {castOrderBy}})}
                        />
                    </div>
                    <div className={formControlStyles.field}>
                        <span id="initial-pages-show-outline" className={formControlStyles.label}>Show outline</span>
                        <ToggleButtonGroup
                            ariaLabelledBy="initial-pages-show-outline"
                            options={BOOLEAN_OPTIONS}
                            value={toBooleanOption(settings.castAndPlace.showOutline)}
                            onChange={value => onUpdate({
                                castAndPlace: {showOutline: fromBooleanOption(value)},
                            })}
                        />
                    </div>
                </div>
            </section>
            <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Songs</h4>
                <div className={formControlStyles.field}>
                    <span id="initial-pages-song-characters" className={formControlStyles.label}>
                        Show characters in songs
                    </span>
                    <ToggleButtonGroup
                        ariaLabelledBy="initial-pages-song-characters"
                        options={BOOLEAN_OPTIONS}
                        value={toBooleanOption(settings.songs.showCharactersInSongs)}
                        onChange={value => onUpdate({
                            songs: {showCharactersInSongs: fromBooleanOption(value)},
                        })}
                    />
                </div>
            </section>
        </SettingsGroup>
    );
};
