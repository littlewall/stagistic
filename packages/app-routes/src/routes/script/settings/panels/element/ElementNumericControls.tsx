import {
    type BlockShortcut,
    type SceneNumberFormat,
    type ScriptBlockNodeType,
} from '@stagistic/script';
import {formControlStyles, FormSelect} from '@stagistic/ui';
import clsx from 'clsx';

import type {ElementNumericModel, ElementsHandlers} from '../types';
import styles from './ElementNumericControls.module.css';

interface ElementNumericControlsProps {
    blockType: ScriptBlockNodeType,
    shortcutPrefix: string,
    model: ElementNumericModel,
    handlers: ElementsHandlers,
    section?: 'format' | 'typing',
}

export const ElementNumericControls = ({
    blockType,
    shortcutPrefix,
    model,
    handlers,
    section = 'format',
}: ElementNumericControlsProps) => {
    const {
        spacingBefore,
        spacingAfter,
        lineHeight,
        shortcut,
        nextElement,
        sceneNumberFormat,
        spacingBeforeOptions,
        spacingAfterOptions,
        lineHeightOptions,
        shortcutOptions,
        nextElementOptions,
        sceneNumberFormatOptions,
    } = model;
    const {onUpdateBlockSettings} = handlers;

    return (
        <div className={clsx(formControlStyles.flatGrid, formControlStyles.flushGrid)}>
            {section === 'format' ? (
                <>
                    <div className={formControlStyles.field}>
                        <span className={formControlStyles.label}>Spacing before</span>
                        <FormSelect
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
                        <div className={formControlStyles.field}>
                            <span className={formControlStyles.label}>Spacing after</span>
                            <FormSelect
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
                    <div className={formControlStyles.field}>
                        <span className={formControlStyles.label}>Line height</span>
                        <FormSelect
                            id="settings-line-height"
                            ariaLabel="Select line height"
                            value={lineHeight}
                            options={lineHeightOptions}
                            onChange={nextValue => {
                                onUpdateBlockSettings(blockType, {lineHeight: Number(nextValue)});
                            }}
                        />
                    </div>
                </>
            ) : null}
            {section === 'typing' && shortcut !== undefined && shortcutOptions ? (
                <div className={formControlStyles.field}>
                    <span className={formControlStyles.label}>Shortcut</span>
                    <div className={styles.shortcutField}>
                        <span className={styles.shortcutPrefix}>{shortcutPrefix} +</span>
                        <FormSelect
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
            {section === 'typing' && nextElement !== undefined && nextElementOptions ? (
                <div className={formControlStyles.field}>
                    <span className={formControlStyles.label}>Next element</span>
                    <FormSelect
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
            {section === 'format' && sceneNumberFormat !== undefined && sceneNumberFormatOptions ? (
                <div className={formControlStyles.field}>
                    <span className={formControlStyles.label}>Scene numbering</span>
                    <FormSelect
                        id="settings-scene-numbering"
                        ariaLabel="Select scene numbering"
                        value={sceneNumberFormat}
                        options={sceneNumberFormatOptions}
                        onChange={nextValue => {
                            onUpdateBlockSettings(blockType, {
                                sceneNumberFormat: nextValue as SceneNumberFormat,
                            });
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
};
