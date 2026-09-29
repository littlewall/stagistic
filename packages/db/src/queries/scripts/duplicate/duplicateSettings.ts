import {uuidv7} from '@stagistic/shared';
import {eq} from 'drizzle-orm';

import {
    scriptSettingsBlocks,
    scriptSettingsHeadersFooters,
    scriptSettingsInitialPages,
    scriptSettingsPageLayout,
    scriptSettingsStructure,
    scriptSettingsVisualPreferences,
} from '../../../schema';
import type {DbClient} from '../../types';

export const duplicateSettings = async (db: DbClient, sourceScriptId: string, targetScriptId: string, now: number): Promise<void> => {
    const pageLayoutRows = await db.select().from(scriptSettingsPageLayout).where(eq(scriptSettingsPageLayout.scriptId, sourceScriptId));

    if (pageLayoutRows.length > 0) {
        await db.insert(scriptSettingsPageLayout).values(
            pageLayoutRows.map(row => ({
                ...row,
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })),
        );
    }

    const visualRows = await db.select().from(scriptSettingsVisualPreferences).where(eq(scriptSettingsVisualPreferences.scriptId, sourceScriptId));

    if (visualRows.length > 0) {
        await db.insert(scriptSettingsVisualPreferences).values(
            visualRows.map(row => ({
                ...row,
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })),
        );
    }

    const structureRows = await db.select().from(scriptSettingsStructure).where(eq(scriptSettingsStructure.scriptId, sourceScriptId));

    if (structureRows.length > 0) {
        await db.insert(scriptSettingsStructure).values(
            structureRows.map(row => ({
                ...row,
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })),
        );
    }

    const initialPagesRows = await db.select().from(scriptSettingsInitialPages).where(eq(scriptSettingsInitialPages.scriptId, sourceScriptId));

    if (initialPagesRows.length > 0) {
        await db.insert(scriptSettingsInitialPages).values(
            initialPagesRows.map(row => ({
                ...row,
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })),
        );
    }

    const headerFooterRows = await db.select().from(scriptSettingsHeadersFooters).where(eq(scriptSettingsHeadersFooters.scriptId, sourceScriptId));

    if (headerFooterRows.length > 0) {
        await db.insert(scriptSettingsHeadersFooters).values(
            headerFooterRows.map(row => ({
                ...row,
                id: uuidv7(),
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })),
        );
    }

    const blockSettingsRows = await db.select().from(scriptSettingsBlocks).where(eq(scriptSettingsBlocks.scriptId, sourceScriptId));

    if (blockSettingsRows.length > 0) {
        await db.insert(scriptSettingsBlocks).values(
            blockSettingsRows.map(row => ({
                ...row,
                id: uuidv7(),
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })),
        );
    }
};
