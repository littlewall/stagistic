import {eq} from 'drizzle-orm';

import {
    scriptSettingsBlocks,
    scriptSettingsHeadersFooters,
    scriptSettingsPageLayout,
    scriptSettingsStructure,
    scriptSettingsVisualPreferences,
} from '../../schema';
import type {DbClient} from '../types';
import type {ReplaceScriptConfigBlocksPayload} from './payloads';

export const getScriptPageLayoutSettings = async (db: DbClient, scriptId: string) => {
    const rows = await db.select().from(scriptSettingsPageLayout)
        .where(eq(scriptSettingsPageLayout.scriptId, scriptId))
        .limit(1);

    return rows[0] ?? null;
};

export const getScriptVisualPreferences = async (db: DbClient, scriptId: string) => {
    const rows = await db.select().from(scriptSettingsVisualPreferences)
        .where(eq(scriptSettingsVisualPreferences.scriptId, scriptId))
        .limit(1);

    return rows[0] ?? null;
};

export const getScriptStructureSettings = async (db: DbClient, scriptId: string) => {
    const rows = await db.select().from(scriptSettingsStructure)
        .where(eq(scriptSettingsStructure.scriptId, scriptId))
        .limit(1);

    return rows[0] ?? null;
};

export const listScriptHeaderFooterSettings = (db: DbClient, scriptId: string) => db
    .select()
    .from(scriptSettingsHeadersFooters)
    .where(eq(scriptSettingsHeadersFooters.scriptId, scriptId));

export const listScriptBlockSettings = (db: DbClient, scriptId: string) => db
    .select()
    .from(scriptSettingsBlocks)
    .where(eq(scriptSettingsBlocks.scriptId, scriptId));

export const deleteScriptSettings = async (db: DbClient, scriptId: string) => {
    await db.delete(scriptSettingsPageLayout).where(eq(scriptSettingsPageLayout.scriptId, scriptId));
    await db.delete(scriptSettingsVisualPreferences).where(eq(scriptSettingsVisualPreferences.scriptId, scriptId));
    await db.delete(scriptSettingsStructure).where(eq(scriptSettingsStructure.scriptId, scriptId));
    await db.delete(scriptSettingsHeadersFooters).where(eq(scriptSettingsHeadersFooters.scriptId, scriptId));
    await db.delete(scriptSettingsBlocks).where(eq(scriptSettingsBlocks.scriptId, scriptId));
};

export const insertScriptPageLayoutSettings = async (
    db: DbClient,
    values: typeof scriptSettingsPageLayout.$inferInsert,
) => {
    await db.insert(scriptSettingsPageLayout).values(values);
};

export const insertScriptVisualPreferences = async (
    db: DbClient,
    values: typeof scriptSettingsVisualPreferences.$inferInsert,
) => {
    await db.insert(scriptSettingsVisualPreferences).values(values);
};

export const insertScriptStructureSettings = async (
    db: DbClient,
    values: typeof scriptSettingsStructure.$inferInsert,
) => {
    await db.insert(scriptSettingsStructure).values(values);
};

export const insertScriptHeaderFooterSettings = async (
    db: DbClient,
    rows: Array<typeof scriptSettingsHeadersFooters.$inferInsert>,
) => {
    if (rows.length > 0) {
        await db.insert(scriptSettingsHeadersFooters).values(rows);
    }
};

export const replaceScriptConfigBlocks = async (
    db: DbClient,
    payload: ReplaceScriptConfigBlocksPayload,
) => {
    await db.delete(scriptSettingsBlocks).where(eq(scriptSettingsBlocks.scriptId, payload.scriptId));

    if (payload.rows.length > 0) {
        await db.insert(scriptSettingsBlocks).values(payload.rows);
    }
};
