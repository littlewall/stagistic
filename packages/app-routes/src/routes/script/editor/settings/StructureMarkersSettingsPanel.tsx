import type {EditorSettings} from '@stagistic/script';
import type {ChangeEvent} from 'react';

import styles from '../../ScriptEditorRoute.module.css';
import type {StructureSettingsPatch} from './types';

interface StructureMarkersSettingsPanelProps {
    structureSettings: EditorSettings['structure'],
    onUpdateStructureSettings: (patch: StructureSettingsPatch) => void,
}

type MusicPrefixField = 'start' | 'end';

const MUSIC_TYPES = [
    {
        id: 'song',
        label: 'Song',
    },
    {
        id: 'reprise',
        label: 'Reprise',
    },
    {
        id: 'underscore',
        label: 'Underscore',
    },
] as const;

export const StructureMarkersSettingsPanel = ({
    structureSettings,
    onUpdateStructureSettings,
}: StructureMarkersSettingsPanelProps) => {
    const updateActDisplay = (
        field: 'linesBefore' | 'linesAfter',
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const nextValue = Number.parseInt(event.target.value, 10);

        onUpdateStructureSettings({
            actDisplay: {
                [field]: Number.isFinite(nextValue) ? nextValue : 0,
            },
        });
    };

    const handleActPrefixChange = (event: ChangeEvent<HTMLInputElement>) => {
        onUpdateStructureSettings({
            actPrefix: event.target.value,
        });
    };

    const handleMusicPrefixChange = (
        musicType: (typeof MUSIC_TYPES)[number]['id'],
        field: MusicPrefixField,
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        onUpdateStructureSettings({
            musicPrefixes: {
                [musicType]: {
                    [field]: event.target.value,
                },
            } as Partial<EditorSettings['structure']['musicPrefixes']>,
        });
    };

    return (
        <div className={styles.panelStack}>
            <h3 className={styles.panelTitle}>Structure Markers</h3>
            <div className={styles.settingsField}>
                <label className={styles.fieldLabel} htmlFor="settings-act-prefix">
                    ACT Prefix
                </label>
                <input
                    id="settings-act-prefix"
                    className={styles.structurePrefixInput}
                    type="text"
                    value={structureSettings.actPrefix}
                    onChange={handleActPrefixChange}
                />
            </div>
            <div className={styles.settingsFlatGrid}>
                <div className={styles.settingsField}>
                    <label className={styles.fieldLabel} htmlFor="settings-act-lines-before">
                        ACT Lines Before
                    </label>
                    <input
                        id="settings-act-lines-before"
                        className={styles.structurePrefixInput}
                        type="number"
                        min={0}
                        max={8}
                        step={1}
                        value={structureSettings.actDisplay.linesBefore}
                        onChange={event => updateActDisplay('linesBefore', event)}
                    />
                </div>
                <div className={styles.settingsField}>
                    <label className={styles.fieldLabel} htmlFor="settings-act-lines-after">
                        ACT Lines After
                    </label>
                    <input
                        id="settings-act-lines-after"
                        className={styles.structurePrefixInput}
                        type="number"
                        min={0}
                        max={8}
                        step={1}
                        value={structureSettings.actDisplay.linesAfter}
                        onChange={event => updateActDisplay('linesAfter', event)}
                    />
                </div>
            </div>
            <div className={styles.structurePrefixGrid}>
                {MUSIC_TYPES.map(musicType => (
                    <div key={musicType.id} className={styles.structurePrefixCard}>
                        <h4 className={styles.structurePrefixCardTitle}>{musicType.label}</h4>
                        <div className={styles.settingsField}>
                            <label className={styles.fieldLabel} htmlFor={`settings-${musicType.id}-start-prefix`}>
                                Start Prefix
                            </label>
                            <input
                                id={`settings-${musicType.id}-start-prefix`}
                                className={styles.structurePrefixInput}
                                type="text"
                                value={structureSettings.musicPrefixes[musicType.id].start}
                                onChange={event => handleMusicPrefixChange(musicType.id, 'start', event)}
                            />
                        </div>
                        <div className={styles.settingsField}>
                            <label className={styles.fieldLabel} htmlFor={`settings-${musicType.id}-end-prefix`}>
                                End Prefix
                            </label>
                            <input
                                id={`settings-${musicType.id}-end-prefix`}
                                className={styles.structurePrefixInput}
                                type="text"
                                value={structureSettings.musicPrefixes[musicType.id].end}
                                onChange={event => handleMusicPrefixChange(musicType.id, 'end', event)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
