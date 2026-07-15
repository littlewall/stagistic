import type {
    CastOrderBy,
    InitialPagesSettings,
    InitialPagesSettingsPatch,
} from '@stagistic/script';
import {
    formControlStyles,
    ToggleButtonGroup,
    type ToggleButtonGroupOption,
} from '@stagistic/ui';
import {
    useEffect,
    useState,
} from 'react';

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

const mergeInitialPagesSettings = (
    settings: InitialPagesSettings,
    patch: InitialPagesSettingsPatch,
): InitialPagesSettings => ({
    castAndPlace: {
        ...settings.castAndPlace,
        ...patch.castAndPlace,
    },
    songs: {
        ...settings.songs,
        ...patch.songs,
    },
});

export const InitialPagesSettingsPanel = ({
    settings,
    onUpdate,
}: InitialPagesSettingsPanelProps) => {
    const [optimisticSettings, setOptimisticSettings] = useState(settings);

    useEffect(() => {
        setOptimisticSettings(settings);
    }, [settings]);

    const updateOptimistically = (patch: InitialPagesSettingsPatch) => {
        setOptimisticSettings(previous => mergeInitialPagesSettings(previous, patch));
        onUpdate(patch);
    };

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Initial pages</h3>
            <section className={styles.section}>
                <h4 className={styles.sectionTitle}>Cast and place</h4>
                <div className={styles.fields}>
                    <div className={formControlStyles.field}>
                        <span id="initial-pages-cast-order" className={formControlStyles.label}>Cast order by</span>
                        <ToggleButtonGroup
                            ariaLabelledBy="initial-pages-cast-order"
                            options={CAST_ORDER_OPTIONS}
                            value={optimisticSettings.castAndPlace.castOrderBy}
                            onChange={castOrderBy => updateOptimistically({castAndPlace: {castOrderBy}})}
                        />
                    </div>
                    <div className={formControlStyles.field}>
                        <span id="initial-pages-show-outline" className={formControlStyles.label}>Show outline</span>
                        <ToggleButtonGroup
                            ariaLabelledBy="initial-pages-show-outline"
                            options={BOOLEAN_OPTIONS}
                            value={toBooleanOption(optimisticSettings.castAndPlace.showOutline)}
                            onChange={value => updateOptimistically({
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
                        value={toBooleanOption(optimisticSettings.songs.showCharactersInSongs)}
                        onChange={value => updateOptimistically({
                            songs: {showCharactersInSongs: fromBooleanOption(value)},
                        })}
                    />
                </div>
            </section>
        </div>
    );
};
