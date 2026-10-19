import {normalizeEditorSettingsBlockType} from './normalize';
import {isCharacterDecoration} from './options';
import type {
    BlockSettings,
    BlockSpacingSettings,
    EditorSettings,
    EditorSettingsOverride,
    PageSettings,
    TypographySettings,
} from './types';

const mergePageSettings = (base: PageSettings, override: Partial<PageSettings>): PageSettings => {
    const merged = {...base};

    for (const [key, value] of Object.entries(override)) {
        if (value !== undefined) {
            merged[key as keyof PageSettings] = value as never;
        }
    }

    return merged;
};

const mergeTypographySettings = (base: TypographySettings, override: Partial<TypographySettings>): TypographySettings => {
    const merged = {...base};

    for (const [key, value] of Object.entries(override)) {
        if (value !== undefined) {
            merged[key as keyof TypographySettings] = value;
        }
    }

    return merged;
};

const mergeBlocks = (base: BlockSettings, override: EditorSettingsOverride['blocks']): BlockSettings => {
    const merged = {...base};

    for (const [blockType, blockOverrides] of Object.entries(override ?? {})) {
        const key = normalizeEditorSettingsBlockType(blockType);

        if (!blockOverrides || !key) {
            continue;
        }

        const block = {...merged[key]};

        for (const [settingKey, value] of Object.entries(blockOverrides)) {
            if (value !== undefined) {
                block[settingKey as keyof BlockSpacingSettings] = value as never;
            }
        }

        merged[key] = block;
    }

    return merged;
};

const mergeHeaderFooter = (base: EditorSettings['headerFooter'], override: NonNullable<EditorSettingsOverride['headerFooter']>) => ({
    header: {
        left: {...base.header.left, ...override.header?.left},
        center: {...base.header.center, ...override.header?.center},
        right: {...base.header.right, ...override.header?.right},
    },
    footer: {
        left: {...base.footer.left, ...override.footer?.left},
        center: {...base.footer.center, ...override.footer?.center},
        right: {...base.footer.right, ...override.footer?.right},
    },
});

const mergeInitialPages = (base: EditorSettings['initialPages'], override: NonNullable<EditorSettingsOverride['initialPages']>) => ({
    castAndPlace: {
        castOrderBy: override.castAndPlace?.castOrderBy ?? base.castAndPlace.castOrderBy,
        showOutline: override.castAndPlace?.showOutline ?? base.castAndPlace.showOutline,
    },
    songs: {
        showCharactersInSongs: override.songs?.showCharactersInSongs ?? base.songs.showCharactersInSongs,
    },
});

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
            next.page = mergePageSettings(next.page, override.page);
        }

        if (override.typography) {
            next.typography = mergeTypographySettings(next.typography, override.typography);
        }

        // Stored overrides may still carry retired keys; only accept known values.
        if (isCharacterDecoration(override.visual?.characterDecoration)) {
            next.visual = {
                ...next.visual,
                characterDecoration: override.visual.characterDecoration,
            };
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
            next.initialPages = mergeInitialPages(next.initialPages, override.initialPages);
        }

        if (override.headerFooter) {
            next.headerFooter = mergeHeaderFooter(next.headerFooter, override.headerFooter);
        }

        if (override.blocks) {
            next = {
                ...next,
                blocks: mergeBlocks(next.blocks, override.blocks),
            };
        }
    }

    return next;
};
