import {type FountainElementType} from '@stagistic/script-core';
import {
    type EditorSettings,
} from '@stagistic/script-core';
import {
    clampCharacterColorSaturation,
    type EditorSettingsOverride,
    normalizeEditorSettingsBlockType,
} from '@stagistic/script-core';

import {
    LINE_HEIGHT_OPTIONS,
    SPACING_BEFORE_OPTIONS,
} from './constants';
import {getClosestStepValue} from './math';

export const normalizeSettingsOverride = (settings: EditorSettingsOverride): EditorSettingsOverride => {
    const nextSettings: EditorSettingsOverride = {
        ...settings,
    };

    if (settings.visual?.characterColorSaturation !== undefined) {
        nextSettings.visual = {
            ...settings.visual,
            characterColorSaturation: clampCharacterColorSaturation(settings.visual.characterColorSaturation),
        };
    }

    if (!settings.blocks) {
        return nextSettings;
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
        ...nextSettings,
        blocks: nextBlocks,
    };
};
