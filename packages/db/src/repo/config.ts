import {type EditorSettingsOverride, type HeaderFooterAlignment} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {DbClient} from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {normalizeSettingsBlockType} from './configBlockTypes';
import {buildConfigRows, hydrateBlockSettings} from './configRows';
import type {GetDb, RecordOutbox, SyncDb} from './types';

type SettingsHandlers = Pick<ScriptRepository, 'loadScriptSettings' | 'saveScriptSettings' | 'deleteScriptSettings'>;

interface CreateSettingsHandlersArgs {
    getDb: GetDb;
    recordOutbox: RecordOutbox;
    syncDb: SyncDb;
}

const ALIGNMENTS: HeaderFooterAlignment[] = ['left', 'center', 'right'];

type DefinedFields<T> = {[Key in keyof T]?: Exclude<T[Key], null | undefined>};

const toDefined = <T extends Record<string, unknown>>(value: T): DefinedFields<T> =>
    Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined)) as DefinedFields<T>;

export const readScriptSettings = async (db: DbClient, scriptId: string): Promise<EditorSettingsOverride | null> => {
    const [pageLayout, visual, structure, initialPages, headerFooterRows, blocks] = await Promise.all([
        dbQueries.getScriptPageLayoutSettings(db, scriptId),
        dbQueries.getScriptVisualPreferences(db, scriptId),
        dbQueries.getScriptStructureSettings(db, scriptId),
        dbQueries.getScriptInitialPagesSettings(db, scriptId),
        dbQueries.listScriptHeaderFooterSettings(db, scriptId),
        dbQueries.listScriptBlockSettings(db, scriptId),
    ]);
    const settings: EditorSettingsOverride = {};
    if (pageLayout) {
        settings.page = toDefined({
            widthPx: pageLayout.widthPx,
            heightPx: pageLayout.heightPx,
            marginTopPx: pageLayout.marginTopPx,
            marginRightPx: pageLayout.marginRightPx,
            marginBottomPx: pageLayout.marginBottomPx,
            marginLeftPx: pageLayout.marginLeftPx,
            pageGapPx: pageLayout.pageGapPx,
            pageBreakBackground: pageLayout.pageBreakBackground,
            contentMarginTopPx: pageLayout.contentMarginTopPx,
            contentMarginBottomPx: pageLayout.contentMarginBottomPx,
        });
        settings.typography = toDefined({fontSizePx: pageLayout.fontSizePx, lineHeight: pageLayout.lineHeight});
    }
    if (typeof visual?.characterColorSaturation === 'number') settings.visual = {characterColorSaturation: visual.characterColorSaturation};
    if (structure) settings.structure = {actDisplay: toDefined({linesBefore: structure.actLinesBefore, linesAfter: structure.actLinesAfter})};
    if (initialPages) {
        settings.initialPages = {
            castAndPlace: toDefined({castOrderBy: initialPages.castOrderBy === 'appearance' ? 'appearance' : 'name', showOutline: initialPages.showOutline}),
            songs: toDefined({showCharactersInSongs: initialPages.showCharactersInSongs}),
        };
    }
    headerFooterRows.forEach(row => {
        if ((row.area !== 'header' && row.area !== 'footer') || !ALIGNMENTS.includes(row.alignment as HeaderFooterAlignment)) return;
        const area = row.area;
        const alignment = row.alignment as HeaderFooterAlignment;
        settings.headerFooter ??= {};
        settings.headerFooter[area] ??= {};
        settings.headerFooter[area][alignment] = {
            text: row.textContent,
            isBold: row.isBold,
            isItalic: row.isItalic,
            isUnderline: row.isUnderline,
            isHiddenInEditor: row.isHiddenInEditor,
        };
    });
    settings.blocks = {};
    [...blocks]
        .sort((a, b) => Number(normalizeSettingsBlockType(a.blockType) === a.blockType) - Number(normalizeSettingsBlockType(b.blockType) === b.blockType))
        .forEach(block => hydrateBlockSettings(settings, block));
    if (Object.keys(settings.blocks).length === 0) delete settings.blocks;
    return Object.keys(settings).length > 0 ? settings : null;
};

export const createSettingsHandlers = ({getDb, recordOutbox, syncDb}: CreateSettingsHandlersArgs): SettingsHandlers => {
    const loadScriptSettings: SettingsHandlers['loadScriptSettings'] = async scriptId => {
        const db = await getDb();
        const settings = await readScriptSettings(db, scriptId);
        return settings;
        /*
         * Kept below temporarily for an isolated, reviewable refactor; remove
         * once the compiler confirms the helper's exact behavioral parity.
         */
        /*
        const settings: EditorSettingsOverride = {};

        if (pageLayout) {
            settings.page = toDefined({
                widthPx: pageLayout.widthPx,
                heightPx: pageLayout.heightPx,
                marginTopPx: pageLayout.marginTopPx,
                marginRightPx: pageLayout.marginRightPx,
                marginBottomPx: pageLayout.marginBottomPx,
                marginLeftPx: pageLayout.marginLeftPx,
                pageGapPx: pageLayout.pageGapPx,
                pageBreakBackground: pageLayout.pageBreakBackground,
                contentMarginTopPx: pageLayout.contentMarginTopPx,
                contentMarginBottomPx: pageLayout.contentMarginBottomPx,
            });
            settings.typography = toDefined({
                fontSizePx: pageLayout.fontSizePx,
                lineHeight: pageLayout.lineHeight,
            });
        }

        if (typeof visual?.characterColorSaturation === 'number') {
            settings.visual = {characterColorSaturation: visual.characterColorSaturation};
        }

        if (structure) {
            settings.structure = {
                actDisplay: toDefined({
                    linesBefore: structure.actLinesBefore,
                    linesAfter: structure.actLinesAfter,
                }),
            };
        }

        if (initialPages) {
            const castOrderBy = initialPages.castOrderBy === 'appearance' ? 'appearance' : 'name';

            settings.initialPages = {
                castAndPlace: toDefined({
                    castOrderBy,
                    showOutline: initialPages.showOutline,
                }),
                songs: toDefined({
                    showCharactersInSongs: initialPages.showCharactersInSongs,
                }),
            };
        }

        headerFooterRows.forEach(row => {
            if ((row.area !== 'header' && row.area !== 'footer')
                || !ALIGNMENTS.includes(row.alignment as HeaderFooterAlignment)) {
                return;
            }

            const area = row.area;
            const alignment = row.alignment as HeaderFooterAlignment;

            settings.headerFooter ??= {};
            settings.headerFooter[area] ??= {};
            settings.headerFooter[area][alignment] = {
                text: row.textContent,
                isBold: row.isBold,
                isItalic: row.isItalic,
                isUnderline: row.isUnderline,
                isHiddenInEditor: row.isHiddenInEditor,
            };
        });

        settings.blocks = {};
        [...blocks]
            .sort((a, b) => Number(normalizeSettingsBlockType(a.blockType) === a.blockType)
                - Number(normalizeSettingsBlockType(b.blockType) === b.blockType))
            .forEach(block => hydrateBlockSettings(settings, block));

        if (Object.keys(settings.blocks).length === 0) {
            delete settings.blocks;
        }

        return Object.keys(settings).length > 0 ? settings : null; */
    };

    const saveScriptSettings: SettingsHandlers['saveScriptSettings'] = async (scriptId, settings) => {
        const db = await getDb();
        const now = Date.now();
        const headerFooterRows = (['header', 'footer'] as const).flatMap(area =>
            ALIGNMENTS.flatMap(alignment => {
                const cell = settings.headerFooter?.[area]?.[alignment];

                return cell
                    ? [
                          {
                              id: uuidv7(),
                              scriptId,
                              area,
                              alignment,
                              textContent: cell.text ?? '',
                              isBold: cell.isBold ?? false,
                              isItalic: cell.isItalic ?? false,
                              isUnderline: cell.isUnderline ?? false,
                              isHiddenInEditor: cell.isHiddenInEditor ?? false,
                              createdAt: now,
                              updatedAt: now,
                          },
                      ]
                    : [];
            }),
        );

        await db.transaction(async tx => {
            await dbQueries.deleteScriptSettings(tx, scriptId);

            if (settings.page || settings.typography) {
                await dbQueries.insertScriptPageLayoutSettings(tx, {
                    scriptId,
                    ...settings.page,
                    fontSizePx: settings.typography?.fontSizePx,
                    lineHeight: settings.typography?.lineHeight,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            if (settings.visual) {
                await dbQueries.insertScriptVisualPreferences(tx, {
                    scriptId,
                    characterColorSaturation: settings.visual.characterColorSaturation,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            if (settings.structure) {
                await dbQueries.insertScriptStructureSettings(tx, {
                    scriptId,
                    actLinesBefore: settings.structure.actDisplay?.linesBefore,
                    actLinesAfter: settings.structure.actDisplay?.linesAfter,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            if (settings.initialPages) {
                await dbQueries.insertScriptInitialPagesSettings(tx, {
                    scriptId,
                    castOrderBy: settings.initialPages.castAndPlace?.castOrderBy,
                    showOutline: settings.initialPages.castAndPlace?.showOutline,
                    showCharactersInSongs: settings.initialPages.songs?.showCharactersInSongs,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            await dbQueries.insertScriptHeaderFooterSettings(tx, headerFooterRows);
            await dbQueries.replaceScriptConfigBlocks(tx, {
                scriptId,
                rows: buildConfigRows(scriptId, settings, now),
            });
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox(
                {
                    scriptId,
                    entityKey: `script:${scriptId}:settings`,
                    opType: 'config.save',
                    occurredAt: now,
                    payloadJson: JSON.stringify({scriptId, updatedAt: now}),
                },
                tx,
            );
        });

        /*
         * Flush the in-memory PGlite WAL to the filesystem; without this the
         * write is lost on page refresh (see content.ts saveLatest).
         */
        await syncDb();
    };

    const deleteScriptSettings: SettingsHandlers['deleteScriptSettings'] = async scriptId => {
        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.deleteScriptSettings(tx, scriptId);
            await dbQueries.updateScriptTimestamp(tx, {scriptId, updatedAt: now});
            await recordOutbox(
                {
                    scriptId,
                    entityKey: `script:${scriptId}:settings`,
                    opType: 'config.delete',
                    occurredAt: now,
                    payloadJson: JSON.stringify({scriptId, deletedAt: now}),
                },
                tx,
            );
        });

        await syncDb();
    };

    return {
        loadScriptSettings,
        saveScriptSettings,
        deleteScriptSettings,
    };
};
