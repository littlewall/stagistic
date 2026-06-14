import {
    type BlockShortcut,
    type ScriptBlockNodeType,
} from '@stagistic/script';

import {
    SettingsSelect,
} from '../SettingsSelect';
import sharedStyles from '../shared.module.css';
import type {
    ElementNumericModel,
    ElementsHandlers,
} from '../types';
import styles from './ElementNumericControls.module.css';

interface ElementNumericControlsProps {
    blockType: ScriptBlockNodeType,
    shortcutPrefix: string,
    model: ElementNumericModel,
    handlers: ElementsHandlers,
}

export const ElementNumericControls = ({
    blockType,
    shortcutPrefix,
    model,
    handlers,
}: ElementNumericControlsProps) => {
    const {
        spacingBefore,
        spacingAfter,
        lineHeight,
        shortcut,
        nextElement,
        spacingBeforeOptions,
        spacingAfterOptions,
        lineHeightOptions,
        shortcutOptions,
        nextElementOptions,
    } = model;
    const {onUpdateBlockSettings} = handlers;

    return (
        <div className={sharedStyles.settingsFlatGrid}>
            <div className={sharedStyles.settingsField}>
                <span className={sharedStyles.fieldLabel}>Spacing before</span>
                <SettingsSelect
                    id="settings-spacing-before"
                    ariaLabel="Select spacing before"
                    value={spacingBefore}
                    options={spacingBeforeOptions}
                    onChange={nextValue => {
                        onUpdateBlockSettings(blockType, {spacingBeforeEm: Number(nextValue)});
                    }}
                />
            </div>
            {spacingAfter !== undefined && spacingAfterOptions ? (
                <div className={sharedStyles.settingsField}>
                    <span className={sharedStyles.fieldLabel}>Spacing after</span>
                    <SettingsSelect
                        id="settings-spacing-after"
                        ariaLabel="Select spacing after"
                        value={spacingAfter}
                        options={spacingAfterOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {spacingAfterEm: Number(nextValue)});
                        }}
                    />
                </div>
            ) : null}
            <div className={sharedStyles.settingsField}>
                <span className={sharedStyles.fieldLabel}>Line height</span>
                <SettingsSelect
                    id="settings-line-height"
                    ariaLabel="Select line height"
                    value={lineHeight}
                    options={lineHeightOptions}
                    onChange={nextValue => {
                        onUpdateBlockSettings(blockType, {lineHeight: Number(nextValue)});
                    }}
                />
            </div>
            {shortcut !== undefined && shortcutOptions ? (
                <div className={sharedStyles.settingsField}>
                    <span className={sharedStyles.fieldLabel}>Shortcut</span>
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
            ) : null}
            {nextElement !== undefined && nextElementOptions ? (
                <div className={sharedStyles.settingsField}>
                    <span className={sharedStyles.fieldLabel}>Next element</span>
                    <SettingsSelect
                        id="settings-next-element"
                        ariaLabel="Select next element"
                        value={nextElement}
                        options={nextElementOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {
                                nextElement: nextValue as ScriptBlockNodeType,
                            });
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
};
