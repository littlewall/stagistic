import type {EditorSettings} from '@stagistic/script';
import {formControlStyles} from '@stagistic/ui';
import type {ChangeEvent} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import type {StructureSettingsPatch} from '../types';

interface StructureMarkersSettingsPanelProps {
    structureSettings: EditorSettings['structure'],
    onUpdateStructureSettings: (patch: StructureSettingsPatch) => void,
}

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

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Structure markers</h3>
            <div className={formControlStyles.flatGrid}>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="settings-act-lines-before">
                        ACT Lines Before
                    </label>
                    <input
                        id="settings-act-lines-before"
                        className={formControlStyles.input}
                        type="number"
                        min={0}
                        max={8}
                        step={1}
                        value={structureSettings.actDisplay.linesBefore}
                        onChange={event => updateActDisplay('linesBefore', event)}
                    />
                </div>
                <div className={formControlStyles.field}>
                    <label className={formControlStyles.label} htmlFor="settings-act-lines-after">
                        ACT Lines After
                    </label>
                    <input
                        id="settings-act-lines-after"
                        className={formControlStyles.input}
                        type="number"
                        min={0}
                        max={8}
                        step={1}
                        value={structureSettings.actDisplay.linesAfter}
                        onChange={event => updateActDisplay('linesAfter', event)}
                    />
                </div>
            </div>
        </div>
    );
};
