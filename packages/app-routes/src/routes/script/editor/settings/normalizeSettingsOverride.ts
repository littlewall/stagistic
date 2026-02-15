import {type FountainElementType} from '@stagistic/editor-core';
import {
    type EditorSettings,
    type EditorSettingsOverride,
    normalizeEditorSettingsBlockType,
} from '@stagistic/shared';

import {
    LINE_HEIGHT_OPTIONS,
    SPACING_BEFORE_OPTIONS,
} from './constants';
import {getClosestStepValue} from './math';

export const normalizeSettingsOverride = (settings: EditorSettingsOverride): EditorSettingsOverride => {
    if (!settings.blocks) {
        return settings;
    }

    const nextBlocks = Object.entries(settings.blocks).reduce<NonNullable<EditorSettingsOverride['blocks']>>(
        (acc, [blockType, blockSettings]) => {
            const normalizedBlockType = normalizeEditorSettingsBlockType(blockType);

            if (!normalizedBlockType) {
                return acc;
            }

            if (!blockSettings) {
                acc[normalizedBlockType] = blockSettings;

                return acc;
            }

            const normalizedBlockSettings = {
                ...blockSettings,
            };

            if (blockSettings.nextElement !== undefined) {
                normalizedBlockSettings.nextElement = normalizeEditorSettingsBlockType(blockSettings.nextElement)
                    ?? undefined;
            }

            if (typeof blockSettings.spacingBeforeEm === 'number') {
                normalizedBlockSettings.spacingBeforeEm = getClosestStepValue(
                    SPACING_BEFORE_OPTIONS,
                    blockSettings.spacingBeforeEm,
                );
            }

            if (typeof blockSettings.lineHeight === 'number') {
                normalizedBlockSettings.lineHeight = getClosestStepValue(
                    LINE_HEIGHT_OPTIONS,
                    blockSettings.lineHeight,
                );
            }

            const compactedBlockSettings = Object.fromEntries(
                Object.entries(normalizedBlockSettings).filter(([, value]) => value !== undefined),
            ) as Partial<EditorSettings['blocks'][FountainElementType]>;

            if (Object.keys(compactedBlockSettings).length === 0) {
                return acc;
            }

            const existingBlockSettings = acc[normalizedBlockType] ?? {};

            acc[normalizedBlockType] = {
                ...existingBlockSettings,
                ...compactedBlockSettings,
            };

            return acc;
        },
        {},
    );

    return {
        ...settings,
        blocks: nextBlocks,
    };
};
