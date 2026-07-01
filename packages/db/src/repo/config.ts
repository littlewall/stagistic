import {
    type EditorSettingsOverride,
    type HeaderFooterAlignment,
} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {ScriptRepository} from '../scriptRepository';
import {normalizeSettingsBlockType} from './configBlockTypes';
import {
    buildConfigRows,
    hydrateBlockSettings,
} from './configRows';
import type {
    GetDb,
    RecordOutbox,
} from './types';

type SettingsHandlers = Pick<
    ScriptRepository,
    'loadScriptSettings' | 'saveScriptSettings' | 'deleteScriptSettings'
>;

interface CreateSettingsHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}

const ALIGNMENTS: HeaderFooterAlignment[] = [
    'left',
    'center',
    'right',
];

type DefinedFields<T> = {[Key in keyof T]?: Exclude<T[Key], null | undefined>};

const toDefined = <T extends Record<string, unknown>>(value: T): DefinedFields<T> => Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined),
) as DefinedFields<T>;

export const createSettingsHandlers = ({
    getDb,
    recordOutbox,
}: CreateSettingsHandlersArgs): SettingsHandlers => {
    const loadScriptSettings: SettingsHandlers['loadScriptSettings'] = async scriptId => {
        const db = await getDb();
        const [
            pageLayout,
            visual,
            structure,
            headerFooterRows,
            blocks,
        ] = await Promise.all([
            dbQueries.getScriptPageLayoutSettings(db, scriptId),
            dbQueries.getScriptVisualPreferences(db, scriptId),
            dbQueries.getScriptStructureSettings(db, scriptId),
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

        return Object.keys(settings).length > 0 ? settings : null;
    };

    const saveScriptSettings: SettingsHandlers['saveScriptSettings'] = async (scriptId, settings) => {
        const db = await getDb();
        const now = Date.now();
        const headerFooterRows = (['header', 'footer'] as const).flatMap(area => ALIGNMENTS.flatMap(alignment => {
            const cell = settings.headerFooter?.[area]?.[alignment];

            return cell ? [
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
            ] : [];
        }));

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

            await dbQueries.insertScriptHeaderFooterSettings(tx, headerFooterRows);
            await dbQueries.replaceScriptConfigBlocks(tx, {
                scriptId,
                rows: buildConfigRows(scriptId, settings, now),
            });
        });

        await recordOutbox({
            scriptId,
            opType: 'config.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
        });
    };

    const deleteScriptSettings: SettingsHandlers['deleteScriptSettings'] = async scriptId => {
        const db = await getDb();

        await dbQueries.deleteScriptSettings(db, scriptId);
        await recordOutbox({
            scriptId,
            opType: 'config.delete',
            payloadJson: JSON.stringify({scriptId, deletedAt: Date.now()}),
        });
    };

    return {
        loadScriptSettings, saveScriptSettings, deleteScriptSettings,
    };
};
