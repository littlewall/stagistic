import {BLOCK_TEXT_ALIGN_OPTIONS, type FountainElementType} from '@stagistic/script';
import {clsx} from '@stagistic/ui';

import styles from './ElementFormattingToolbar.module.css';
import type {
    BlockSettingsPatch,
    ElementFormattingModel,
    ElementsHandlers,
} from '../types';

interface ElementFormattingToolbarProps {
    blockType: FountainElementType,
    model: ElementFormattingModel,
    handlers: ElementsHandlers,
}

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
    model,
    handlers,
}: ElementFormattingToolbarProps) => {
    const update = (patch: BlockSettingsPatch) => handlers.onUpdateBlockSettings(blockType, patch);
    const {
        textAlign,
        casing,
        isBold,
        isItalic,
        isUnderline,
    } = model;

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
                            update({textAlign: option});
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
                        update({casing: 'normal'});
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
                        update({casing: 'uppercase'});
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
                        update({isBold: !isBold});
                    }}
                    aria-label="Bold"
                >
                    <span className={styles.textIcon}>B</span>
                </button>
                <button
                    type="button"
                    className={clsx(styles.toolbarButton, isItalic && styles.toolbarButtonActive)}
                    onClick={() => {
                        update({isItalic: !isItalic});
                    }}
                    aria-label="Italic"
                >
                    <span className={clsx(styles.textIcon, styles.textIconItalic)}>I</span>
                </button>
                <button
                    type="button"
                    className={clsx(styles.toolbarButton, isUnderline && styles.toolbarButtonActive)}
                    onClick={() => {
                        update({isUnderline: !isUnderline});
                    }}
                    aria-label="Underline"
                >
                    <span className={clsx(styles.textIcon, styles.textIconUnderline)}>U</span>
                </button>
            </div>
        </div>
    );
};
