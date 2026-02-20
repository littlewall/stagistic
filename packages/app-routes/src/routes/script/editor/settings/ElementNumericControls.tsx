import {
    type BlockShortcut,
    type FountainElementType,
} from '@stagistic/script-core';

import styles from '../../ScriptEditorRoute.module.css';
import {
    SettingsSelect,
} from './SettingsSelect';
import type {
    ElementNumericModel,
    ElementSettingsActions,
} from './types';

interface ElementNumericControlsProps {
    blockType: FountainElementType,
    shortcutPrefix: string,
    model: ElementNumericModel,
    actions: ElementSettingsActions,
}

export const ElementNumericControls = ({
    blockType,
    shortcutPrefix,
    model,
    actions,
}: ElementNumericControlsProps) => {
    const {
        spacingBefore,
        lineHeight,
        shortcut,
        nextElement,
        spacingBeforeOptions,
        lineHeightOptions,
        shortcutOptions,
        nextElementOptions,
    } = model;
    const {onUpdateBlockSettings} = actions;

    return (
        <div className={styles.settingsFlatGrid}>
            <div className={styles.settingsField}>
                <span className={styles.fieldLabel}>Spacing before</span>
                <SettingsSelect
                    id="settings-spacing-before"
                    ariaLabel="Select spacing before"
                    value={spacingBefore}
                    options={spacingBeforeOptions}
                    onChange={nextValue => {
                        onUpdateBlockSettings(blockType, {
                            spacingBeforeEm: Number(nextValue),
                        });
                    }}
                />
            </div>
            <div className={styles.settingsField}>
                <span className={styles.fieldLabel}>Line height</span>
                <SettingsSelect
                    id="settings-line-height"
                    ariaLabel="Select line height"
                    value={lineHeight}
                    options={lineHeightOptions}
                    onChange={nextValue => {
                        onUpdateBlockSettings(blockType, {
                            lineHeight: Number(nextValue),
                        });
                    }}
                />
            </div>
            <div className={styles.settingsField}>
                <span className={styles.fieldLabel}>Shortcut</span>
                <div className={styles.shortcutField}>
                    <span className={styles.shortcutPrefix}>{shortcutPrefix} +</span>
                    <SettingsSelect
                        ariaLabel="Select block shortcut"
                        value={shortcut}
                        options={shortcutOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {
                                shortcut: nextValue as BlockShortcut,
                            });
                        }}
                    />
                </div>
            </div>
            <div className={styles.settingsField}>
                <span className={styles.fieldLabel}>Next element</span>
                <SettingsSelect
                    id="settings-next-element"
                    ariaLabel="Select next element"
                    value={nextElement}
                    options={nextElementOptions}
                    onChange={nextValue => {
                        onUpdateBlockSettings(blockType, {
                            nextElement: nextValue as FountainElementType,
                        });
                    }}
                />
            </div>
        </div>
    );
};
