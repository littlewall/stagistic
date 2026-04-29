import {normalizeEditorSettingsBlockType} from './normalize';
import type {
    BlockSettings,
    BlockSpacingSettings,
    EditorSettings,
    EditorSettingsOverride,
    PageSettings,
    TypographySettings,
    VisualSettings,
} from './types';

export const mergeEditorSettings = (
    base: EditorSettings,
    ...overrides: Array<EditorSettingsOverride | null | undefined>
): EditorSettings => {
    let next: EditorSettings = {
        page: {...base.page},
        typography: {...base.typography},
        visual: {...base.visual},
        structure: {
            actPrefix: base.structure.actPrefix,
            actDisplay: {
                linesBefore: base.structure.actDisplay.linesBefore,
                linesAfter: base.structure.actDisplay.linesAfter,
            },
        },
        blocks: {...base.blocks},
    };

    for (const override of overrides) {
        if (!override) {
            continue;
        }

        if (override.page) {
            const mergedPage = {
                ...next.page,
            };

            for (const [key, value] of Object.entries(override.page)) {
                if (value === undefined) {
                    continue;
                }

                mergedPage[key as keyof PageSettings] = value as never;
            }

            next.page = mergedPage;
        }

        if (override.typography) {
            const mergedTypography = {
                ...next.typography,
            };

            for (const [key, value] of Object.entries(override.typography)) {
                if (value === undefined) {
                    continue;
                }

                mergedTypography[key as keyof TypographySettings] = value as never;
            }

            next.typography = mergedTypography;
        }

        if (override.visual) {
            const mergedVisual = {
                ...next.visual,
            };

            for (const [key, value] of Object.entries(override.visual)) {
                if (value === undefined) {
                    continue;
                }

                mergedVisual[key as keyof VisualSettings] = value as never;
            }

            next.visual = mergedVisual;
        }

        if (override.structure) {
            next.structure = {
                actPrefix: override.structure.actPrefix ?? next.structure.actPrefix,
                actDisplay: {
                    linesBefore: override.structure.actDisplay?.linesBefore
                        ?? next.structure.actDisplay.linesBefore,
                    linesAfter: override.structure.actDisplay?.linesAfter
                        ?? next.structure.actDisplay.linesAfter,
                },
            };
        }

        if (override.blocks) {
            const mergedBlocks: BlockSettings = {
                ...next.blocks,
            };

            for (const [blockType, blockOverrides] of Object.entries(override.blocks)) {
                if (!blockOverrides) {
                    continue;
                }

                const key = normalizeEditorSettingsBlockType(blockType);

                if (!key) {
                    continue;
                }

                const mergedBlock = {
                    ...mergedBlocks[key],
                };

                for (const [settingKey, settingValue] of Object.entries(blockOverrides)) {
                    if (settingValue === undefined) {
                        continue;
                    }

                    mergedBlock[settingKey as keyof BlockSpacingSettings] = settingValue as never;
                }

                mergedBlocks[key] = mergedBlock;
            }

            next = {
                ...next,
                blocks: mergedBlocks,
            };
        }
    }

    return next;
};
