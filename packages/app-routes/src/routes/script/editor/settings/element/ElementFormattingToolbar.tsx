import {
    BLOCK_TEXT_ALIGN_OPTIONS,
    type BlockCasing,
    type BlockTextAlign,
    type ScriptBlockNodeType,
} from '@stagistic/script';
import {
    clsx,
    ToggleButtonGroup,
    type ToggleButtonGroupOption,
} from '@stagistic/ui';

import type {
    BlockSettingsPatch,
    ElementFormattingModel,
    ElementsHandlers,
} from '../types';
import styles from './ElementFormattingToolbar.module.css';

interface ElementFormattingToolbarProps {
    blockType: ScriptBlockNodeType,
    model: ElementFormattingModel,
    handlers: ElementsHandlers,
}

type TextStyle = 'bold' | 'italic' | 'underline';

const ALIGNMENT_OPTIONS: ToggleButtonGroupOption<BlockTextAlign>[] = BLOCK_TEXT_ALIGN_OPTIONS.map(option => ({
    value: option,
    label: `${option} align`,
    content: <span className={clsx(styles.alignGlyph, styles[option])} />,
    isIconOnly: true,
}));

const CASING_OPTIONS: ToggleButtonGroupOption<BlockCasing>[] = [
    {
        value: 'normal', label: 'Normal casing', content: <span className={styles.textIcon}>Aa</span>, isIconOnly: true,
    },
    {
        value: 'uppercase', label: 'Uppercase casing', content: <span className={styles.textIcon}>AA</span>, isIconOnly: true,
    },
    {
        value: 'lowercase', label: 'Lowercase casing', content: <span className={styles.textIcon}>aa</span>, isIconOnly: true,
    },
];

const TEXT_STYLE_OPTIONS: ToggleButtonGroupOption<TextStyle>[] = [
    {
        value: 'bold', label: 'Bold', content: <span className={styles.textIcon}>B</span>, isIconOnly: true,
    },
    {
        value: 'italic', label: 'Italic', content: <span className={clsx(styles.textIcon, styles.textIconItalic)}>I</span>, isIconOnly: true,
    },
    {
        value: 'underline', label: 'Underline', content: <span className={clsx(styles.textIcon, styles.textIconUnderline)}>U</span>, isIconOnly: true,
    },
];

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
    const activeTextStyles: TextStyle[] = [];

    if (isBold) {
        activeTextStyles.push('bold');
    }

    if (isItalic) {
        activeTextStyles.push('italic');
    }

    if (isUnderline) {
        activeTextStyles.push('underline');
    }

    return (
        <div className={styles.previewToolbar}>
            <ToggleButtonGroup
                ariaLabel="Text alignment"
                options={ALIGNMENT_OPTIONS}
                value={textAlign}
                onChange={value => update({textAlign: value})}
            />
            <ToggleButtonGroup
                ariaLabel="Text casing"
                options={CASING_OPTIONS}
                value={casing}
                onChange={value => update({casing: value})}
            />
            <ToggleButtonGroup
                ariaLabel="Text formatting"
                options={TEXT_STYLE_OPTIONS}
                selectionMode="multiple"
                value={activeTextStyles}
                onChange={values => update({
                    isBold: values.includes('bold'),
                    isItalic: values.includes('italic'),
                    isUnderline: values.includes('underline'),
                })}
            />
        </div>
    );
};
