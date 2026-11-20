import {DEFAULT_EDITOR_SETTINGS} from '../settings/defaults';
import type {BlockSpacingSettings, EditorSettings} from '../settings/types';

const sameValues = (left: unknown, right: unknown): boolean => {
    if (left === right) return true;

    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;

    const first = left as Record<string, unknown>;
    const second = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(first), ...Object.keys(second)]);

    return [...keys].every(key => sameValues(first[key], second[key]));
};

const blockFormat = (block: BlockSpacingSettings, typography: EditorSettings['typography']) => Object.fromEntries(
    Object.entries({
        spacingBeforeEm: 0,
        spacingAfterEm: 0,
        indentLeftChars: 0,
        indentRightChars: 0,
        indentLeftPx: 0,
        indentRightPx: 0,
        fontSizePx: typography.fontSizePx,
        lineHeight: typography.lineHeight,
        textAlign: 'left',
        casing: 'normal',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        parenWrap: false,
        ...block,
    }).filter(([key]) => key !== 'shortcut' && key !== 'nextElement'),
);

const formatValues = (settings: EditorSettings) => ({
    blocks: Object.fromEntries(Object.entries(settings.blocks).map(([type, block]) => [type, blockFormat(block, settings.typography)])),
});

/** Default is derived from block styles; page settings and Typing remain independent. */
export const haveSameBlockStyles = (left: EditorSettings, right: EditorSettings) => sameValues(formatValues(left), formatValues(right));

export const isStagisticDefaultFormat = (settings: EditorSettings) => {
    return haveSameBlockStyles(settings, {...DEFAULT_EDITOR_SETTINGS, typography: settings.typography});
};

/** Compare the current block alone, including Typing, against what its reset restores. */
export const isDefaultBlockSettings = (settings: EditorSettings, blockType: string) => {
    const block = settings.blocks[blockType];
    const defaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];

    if (!block || !defaults) return false;

    return sameValues({
        ...blockFormat(block, settings.typography),
        shortcut: block.shortcut,
        nextElement: block.nextElement,
    }, {
        ...blockFormat(defaults, settings.typography),
        shortcut: defaults.shortcut,
        nextElement: defaults.nextElement,
    });
};
