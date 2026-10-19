import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    DEFAULT_EDITOR_SETTINGS,
    DEFAULT_SCENE_NUMBER_FORMAT,
    isSceneNumberFormat,
    SCENE_NUMBER_FORMAT_OPTIONS,
    type SceneNumberFormat,
} from '@stagistic/script';

import {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS} from '../../settingsMenu';
import type {ElementSettingsPanelProps, ElementSettingsViewModel} from '../types';

const SCENE_NUMBER_FORMAT_LABELS: Record<SceneNumberFormat, string> = {
    none: 'No numbering',
    dot: '1.',
    paren: '1)',
};

type ModelArgs = Pick<ElementSettingsPanelProps, 'blockType' | 'resolvedScriptSettings'>;

export const NEXT_ELEMENT_ITEMS = SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.filter(
    item => item.blockType !== 'act' && item.blockType !== 'scene' && item.blockType !== 'note',
);

export const getPageValues = (resolvedScriptSettings: ElementSettingsPanelProps['resolvedScriptSettings']) => {
    const pageWidthPx = resolvedScriptSettings.page.widthPx ?? DEFAULT_EDITOR_SETTINGS.page.widthPx;
    const pageMarginLeftPx = resolvedScriptSettings.page.marginLeftPx ?? DEFAULT_EDITOR_SETTINGS.page.marginLeftPx;
    const pageMarginRightPx = resolvedScriptSettings.page.marginRightPx ?? DEFAULT_EDITOR_SETTINGS.page.marginRightPx;
    const typographyFontSizePx = resolvedScriptSettings.typography.fontSizePx ?? DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;
    const fallbackTypographyLineHeight = resolvedScriptSettings.typography.lineHeight ?? DEFAULT_EDITOR_SETTINGS.typography.lineHeight;

    return {
        pageWidthPx,
        pageMarginLeftPx,
        pageMarginRightPx,
        typographyFontSizePx,
        fallbackTypographyLineHeight,
    };
};

export const getIndents = ({blockType, resolvedScriptSettings}: ModelArgs) => {
    const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
    const blockSettings = resolvedScriptSettings.blocks[blockType];
    const leftIndent = blockSettings.indentLeftChars ?? blockDefaults.indentLeftChars ?? 0;
    const rightIndent = blockSettings.indentRightChars ?? blockDefaults.indentRightChars ?? 0;

    return {leftIndent, rightIndent};
};

export const getNavigationValues = ({blockType, resolvedScriptSettings}: ModelArgs) => {
    const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
    const blockSettings = resolvedScriptSettings.blocks[blockType];
    const nextElementItems = NEXT_ELEMENT_ITEMS;
    const isActBlock = blockType === 'act';
    const shortcut = isActBlock ? undefined : blockSettings.shortcut ?? blockDefaults.shortcut ?? BLOCK_SHORTCUT_OPTIONS[0];
    const isValidNextElement = (value: unknown): value is ElementSettingsViewModel['numeric']['nextElement'] => {
        return typeof value === 'string' && nextElementItems.some(item => item.blockType === value);
    };
    const nextElement = isActBlock
        ? undefined
        : (() => {
            const candidate = blockSettings.nextElement ?? blockDefaults.nextElement ?? blockType;

            return isValidNextElement(candidate) ? candidate : nextElementItems[0]?.blockType;
        })();
    const isSceneBlock = blockType === 'scene';
    const sceneNumberFormat = isSceneBlock
        ? (() => {
            const candidate = blockSettings.sceneNumberFormat ?? blockDefaults.sceneNumberFormat ?? DEFAULT_SCENE_NUMBER_FORMAT;

            return isSceneNumberFormat(candidate) ? candidate : DEFAULT_SCENE_NUMBER_FORMAT;
        })()
        : undefined;
    const sceneNumberFormatOptions = isSceneBlock
        ? SCENE_NUMBER_FORMAT_OPTIONS.map(option => ({
            value: option,
            label: SCENE_NUMBER_FORMAT_LABELS[option],
        }))
        : undefined;

    return {
        isActBlock,
        shortcut,
        nextElement,
        sceneNumberFormat,
        sceneNumberFormatOptions,
    };
};

export const getFormattingValues = ({blockType, resolvedScriptSettings}: ModelArgs) => {
    const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
    const blockSettings = resolvedScriptSettings.blocks[blockType];
    const textAlign = blockSettings.textAlign ?? blockDefaults.textAlign ?? BLOCK_TEXT_ALIGN_OPTIONS[0];
    const casing = blockSettings.casing ?? blockDefaults.casing ?? BLOCK_CASING_OPTIONS[0];
    const isBold = blockSettings.isBold ?? blockDefaults.isBold ?? false;
    const isItalic = blockSettings.isItalic ?? blockDefaults.isItalic ?? false;
    const isUnderline = blockSettings.isUnderline ?? blockDefaults.isUnderline ?? false;

    return {
        textAlign,
        casing,
        isBold,
        isItalic,
        isUnderline,
    };
};
