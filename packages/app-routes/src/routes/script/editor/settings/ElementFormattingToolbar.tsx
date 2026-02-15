import {BLOCK_TEXT_ALIGN_OPTIONS, type FountainElementType} from '@stagistic/script-core';
import {clsx} from '@stagistic/ui';

import styles from '../../ScriptEditorRoute.module.css';
import type {BlockSettingsPatch, UpdateBlockSettings} from './types';

type ElementFormattingToolbarProps = {
    blockType: FountainElementType,
    textAlign: 'left' | 'center' | 'right',
    casing: 'normal' | 'uppercase',
    isBold: boolean,
    isItalic: boolean,
    isUnderline: boolean,
    onUpdateBlockSettings: UpdateBlockSettings,
};

const withPatch = (
    blockType: FountainElementType,
    onUpdateBlockSettings: UpdateBlockSettings,
    patch: BlockSettingsPatch,
) => {
    onUpdateBlockSettings(blockType, patch);
};

const getAlignGlyphClassName = (option: 'left' | 'center' | 'right') => {
    if (option === 'left') {
        return styles.alignGlyphLeft;
    }

    if (option === 'center') {
        return styles.alignGlyphCenter;
    }

    return styles.alignGlyphRight;
};

export const ElementFormattingToolbar = ({
    blockType,
    textAlign,
    casing,
    isBold,
    isItalic,
    isUnderline,
    onUpdateBlockSettings,
}: ElementFormattingToolbarProps) => {
    return (
        <div className={styles.previewToolbar}>
            <div className={styles.toolbarGroup}>
                {BLOCK_TEXT_ALIGN_OPTIONS.map(option => (
                    <button
                        key={option}
                        type="button"
                        className={clsx(
                            styles.toolbarButton,
                            option === textAlign && styles.toolbarButtonActive,
                        )}
                        onClick={() => {
                            withPatch(blockType, onUpdateBlockSettings, {textAlign: option});
                        }}
                        aria-label={`${option} align`}
                    >
                        <span
                            className={clsx(styles.alignGlyph, getAlignGlyphClassName(option))}
                        />
                    </button>
                ))}
            </div>
            <div className={styles.toolbarGroup}>
                <button
                    type="button"
                    className={clsx(
                        styles.toolbarButton,
                        casing === 'normal' && styles.toolbarButtonActive,
                    )}
                    onClick={() => {
                        withPatch(blockType, onUpdateBlockSettings, {casing: 'normal'});
                    }}
                    aria-label="Normal casing"
                >
                    <span className={styles.textIcon}>Aa</span>
                </button>
                <button
                    type="button"
                    className={clsx(
                        styles.toolbarButton,
                        casing === 'uppercase' && styles.toolbarButtonActive,
                    )}
                    onClick={() => {
                        withPatch(blockType, onUpdateBlockSettings, {casing: 'uppercase'});
                    }}
                    aria-label="Uppercase casing"
                >
                    <span className={styles.textIcon}>AA</span>
                </button>
            </div>
            <div className={styles.toolbarGroup}>
                <button
                    type="button"
                    className={clsx(styles.toolbarButton, isBold && styles.toolbarButtonActive)}
                    onClick={() => {
                        withPatch(blockType, onUpdateBlockSettings, {isBold: !isBold});
                    }}
                    aria-label="Bold"
                >
                    <span className={styles.textIcon}>B</span>
                </button>
                <button
                    type="button"
                    className={clsx(styles.toolbarButton, isItalic && styles.toolbarButtonActive)}
                    onClick={() => {
                        withPatch(blockType, onUpdateBlockSettings, {isItalic: !isItalic});
                    }}
                    aria-label="Italic"
                >
                    <span className={clsx(styles.textIcon, styles.textIconItalic)}>I</span>
                </button>
                <button
                    type="button"
                    className={clsx(styles.toolbarButton, isUnderline && styles.toolbarButtonActive)}
                    onClick={() => {
                        withPatch(blockType, onUpdateBlockSettings, {isUnderline: !isUnderline});
                    }}
                    aria-label="Underline"
                >
                    <span className={clsx(styles.textIcon, styles.textIconUnderline)}>U</span>
                </button>
            </div>
        </div>
    );
};
