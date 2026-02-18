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

    if (settings.structure) {
        const nextStructure: NonNullable<EditorSettingsOverride['structure']> = {};
        const rawLinesBefore = settings.structure.actDisplay?.linesBefore;
        const rawLinesAfter = settings.structure.actDisplay?.linesAfter;
        const actPrefix = typeof settings.structure.actPrefix === 'string'
            ? settings.structure.actPrefix.trim()
            : undefined;

        if (actPrefix) {
            nextStructure.actPrefix = actPrefix;
        }

        if (rawLinesBefore !== undefined || rawLinesAfter !== undefined) {
            const normalizeLineCount = (value: number | undefined) => {
                if (typeof value !== 'number' || !Number.isFinite(value)) {
                    return undefined;
                }

                return Math.max(0, Math.min(8, Math.round(value)));
            };
            const linesBefore = normalizeLineCount(rawLinesBefore);
            const linesAfter = normalizeLineCount(rawLinesAfter);

            if (linesBefore !== undefined || linesAfter !== undefined) {
                const nextActDisplay: NonNullable<NonNullable<EditorSettingsOverride['structure']>['actDisplay']> = {};

                if (linesBefore !== undefined) {
                    nextActDisplay.linesBefore = linesBefore;
                }

                if (linesAfter !== undefined) {
                    nextActDisplay.linesAfter = linesAfter;
                }

                if (Object.keys(nextActDisplay).length > 0) {
                    nextStructure.actDisplay = nextActDisplay;
                }
            }
        }

        if (settings.structure.musicPrefixes) {
            const nextMusicPrefixes: NonNullable<NonNullable<EditorSettingsOverride['structure']>['musicPrefixes']> = {};

            ([
                'song',
                'reprise',
                'underscore',
            ] as const).forEach(musicType => {
                const source = settings.structure?.musicPrefixes?.[musicType];

                if (!source) {
                    return;
                }

                const start = typeof source.start === 'string' ? source.start.trim() : '';
                const end = typeof source.end === 'string' ? source.end.trim() : '';

                if (!start && !end) {
                    return;
                }

                const nextTypePrefixes: Partial<NonNullable<NonNullable<EditorSettingsOverride['structure']>['musicPrefixes']>[typeof musicType]> = {};

                if (start) {
                    nextTypePrefixes.start = start;
                }

                if (end) {
                    nextTypePrefixes.end = end;
                }

                if (Object.keys(nextTypePrefixes).length === 0) {
                    return;
                }

                nextMusicPrefixes[musicType] = nextTypePrefixes;
            });

            if (Object.keys(nextMusicPrefixes).length > 0) {
                nextStructure.musicPrefixes = nextMusicPrefixes;
            }
        }

        if (Object.keys(nextStructure).length > 0) {
            nextSettings.structure = nextStructure;
        }
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
