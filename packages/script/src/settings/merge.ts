import {normalizeEditorSettingsBlockType} from './normalize';
import type {BlockSettings, BlockSpacingSettings, EditorSettings, EditorSettingsOverride, PageSettings, TypographySettings, VisualSettings} from './types';

export const mergeEditorSettings = (base: EditorSettings, ...overrides: Array<EditorSettingsOverride | null | undefined>): EditorSettings => {
    let next: EditorSettings = {
        page: {...base.page},
        typography: {...base.typography},
        visual: {...base.visual},
        structure: {
            actDisplay: {
                linesBefore: base.structure.actDisplay.linesBefore,
                linesAfter: base.structure.actDisplay.linesAfter,
            },
        },
        initialPages: {
            castAndPlace: {...base.initialPages.castAndPlace},
            songs: {...base.initialPages.songs},
        },
        headerFooter: {
            header: {
                left: {...base.headerFooter.header.left},
                center: {...base.headerFooter.header.center},
                right: {...base.headerFooter.header.right},
            },
            footer: {
                left: {...base.headerFooter.footer.left},
                center: {...base.headerFooter.footer.center},
                right: {...base.headerFooter.footer.right},
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

                mergedTypography[key as keyof TypographySettings] = value;
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

                mergedVisual[key as keyof VisualSettings] = value;
            }

            next.visual = mergedVisual;
        }

        if (override.structure) {
            next.structure = {
                actDisplay: {
                    linesBefore: override.structure.actDisplay?.linesBefore ?? next.structure.actDisplay.linesBefore,
                    linesAfter: override.structure.actDisplay?.linesAfter ?? next.structure.actDisplay.linesAfter,
                },
            };
        }

        if (override.initialPages) {
            next.initialPages = {
                castAndPlace: {
                    castOrderBy: override.initialPages.castAndPlace?.castOrderBy ?? next.initialPages.castAndPlace.castOrderBy,
                    showOutline: override.initialPages.castAndPlace?.showOutline ?? next.initialPages.castAndPlace.showOutline,
                },
                songs: {
                    showCharactersInSongs: override.initialPages.songs?.showCharactersInSongs ?? next.initialPages.songs.showCharactersInSongs,
                },
            };
        }

        if (override.headerFooter) {
            next.headerFooter = {
                header: {
                    left: {...next.headerFooter.header.left, ...override.headerFooter.header?.left},
                    center: {...next.headerFooter.header.center, ...override.headerFooter.header?.center},
                    right: {...next.headerFooter.header.right, ...override.headerFooter.header?.right},
                },
                footer: {
                    left: {...next.headerFooter.footer.left, ...override.headerFooter.footer?.left},
                    center: {...next.headerFooter.footer.center, ...override.headerFooter.footer?.center},
                    right: {...next.headerFooter.footer.right, ...override.headerFooter.footer?.right},
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
