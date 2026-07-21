import {uuidv7} from '@stagistic/shared';
import {
    eq,
    inArray,
} from 'drizzle-orm';

import {
    scriptActs,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptCharacterGenders,
    scriptCharacters,
    scriptLocations,
    scriptMusic,
    scripts,
    scriptSceneLocations,
    scriptScenes,
    scriptSettingsBlocks,
    scriptSettingsHeadersFooters,
    scriptSettingsInitialPages,
    scriptSettingsPageLayout,
    scriptSettingsStructure,
    scriptSettingsVisualPreferences,
} from '../../schema';
import type {DbClient} from '../types';

export interface DuplicateScriptQueryPayload {
    sourceScriptId: string,
    targetScriptId: string,
    title: string,
    now: number,
    copySettings: boolean,
    copyAttributes: boolean,
}

/**
 * Remaps a nullable foreign key through an id map. Unknown ids fall back to null
 * (the referenced row was not copied), matching the `on delete set null` behavior.
 */
const remapNullable = (map: Map<string, string>, id: string | null): string | null => id === null ? null : map.get(id) ?? null;

/**
 * Copy every row of a script into a fresh script within a single transaction.
 *
 * Content (blocks, acts, scenes, locations, music) is always copied. Settings and
 * confirmed characters are copied only when the corresponding flag is set. The
 * title page is never copied. All primary keys are regenerated and every
 * cross-reference is remapped to the new ids.
 */
export const duplicateScriptRows = async (
    db: DbClient,
    payload: DuplicateScriptQueryPayload,
): Promise<void> => {
    const {
        sourceScriptId,
        targetScriptId,
        title,
        now,
        copySettings,
        copyAttributes,
    } = payload;

    await db.insert(scripts).values({
        id: targetScriptId,
        title,
        subtitle: null,
        createdAt: now,
        updatedAt: now,
        activeBlockId: null,
    });

    const locationRows = await db
        .select()
        .from(scriptLocations)
        .where(eq(scriptLocations.scriptId, sourceScriptId));
    const actRows = await db
        .select()
        .from(scriptActs)
        .where(eq(scriptActs.scriptId, sourceScriptId));
    const sceneRows = await db
        .select()
        .from(scriptScenes)
        .where(eq(scriptScenes.scriptId, sourceScriptId));
    const blockRows = await db
        .select()
        .from(scriptBlocks)
        .where(eq(scriptBlocks.scriptId, sourceScriptId));
    const musicRows = await db
        .select()
        .from(scriptMusic)
        .where(eq(scriptMusic.scriptId, sourceScriptId));
    const sceneIds = sceneRows.map(row => row.id);
    const sceneLocationRows = sceneIds.length > 0
        ? await db
            .select()
            .from(scriptSceneLocations)
            .where(inArray(scriptSceneLocations.sceneId, sceneIds))
        : [];

    const locationMap = new Map(locationRows.map(row => [row.id, uuidv7()]));
    const actMap = new Map(actRows.map(row => [row.id, uuidv7()]));
    const sceneMap = new Map(sceneRows.map(row => [row.id, uuidv7()]));
    const blockMap = new Map(blockRows.map(row => [row.id, uuidv7()]));

    if (locationRows.length > 0) {
        await db.insert(scriptLocations).values(locationRows.map(row => ({
            ...row,
            id: locationMap.get(row.id)!,
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }

    if (actRows.length > 0) {
        await db.insert(scriptActs).values(actRows.map(row => ({
            ...row,
            id: actMap.get(row.id)!,
            scriptId: targetScriptId,
            headingBlockId: remapNullable(blockMap, row.headingBlockId),
            createdAt: now,
            updatedAt: now,
        })));
    }

    if (sceneRows.length > 0) {
        await db.insert(scriptScenes).values(sceneRows.map(row => ({
            ...row,
            id: sceneMap.get(row.id)!,
            scriptId: targetScriptId,
            headingBlockId: remapNullable(blockMap, row.headingBlockId),
            locationId: remapNullable(locationMap, row.locationId),
            createdAt: now,
            updatedAt: now,
        })));
    }

    if (sceneLocationRows.length > 0) {
        await db.insert(scriptSceneLocations).values(sceneLocationRows.map(row => ({
            sceneId: sceneMap.get(row.sceneId)!,
            locationId: locationMap.get(row.locationId)!,
        })));
    }

    if (blockRows.length > 0) {
        await db.insert(scriptBlocks).values(blockRows.map(row => ({
            ...row,
            id: blockMap.get(row.id)!,
            scriptId: targetScriptId,
            sceneId: remapNullable(sceneMap, row.sceneId),
            actId: remapNullable(actMap, row.actId),
            createdAt: now,
            updatedAt: now,
        })));
    }

    if (musicRows.length > 0) {
        await db.insert(scriptMusic).values(musicRows.map(row => ({
            ...row,
            id: uuidv7(),
            scriptId: targetScriptId,
            startBlockId: remapNullable(blockMap, row.startBlockId),
            endBlockId: remapNullable(blockMap, row.endBlockId),
            createdAt: now,
            updatedAt: now,
        })));
    }

    if (copyAttributes) {
        const characterRows = await db
            .select()
            .from(scriptCharacters)
            .where(eq(scriptCharacters.scriptId, sourceScriptId));
        const genderRows = await db
            .select()
            .from(scriptCharacterGenders)
            .where(eq(scriptCharacterGenders.scriptId, sourceScriptId));
        const characterMap = new Map(characterRows.map(row => [row.id, uuidv7()]));

        if (characterRows.length > 0) {
            await db.insert(scriptCharacters).values(characterRows.map(row => ({
                ...row,
                id: characterMap.get(row.id)!,
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })));
        }

        if (genderRows.length > 0) {
            await db.insert(scriptCharacterGenders).values(genderRows.map(row => ({
                ...row,
                id: uuidv7(),
                scriptId: targetScriptId,
                createdAt: now,
                updatedAt: now,
            })));
        }

        const blockIds = blockRows.map(row => row.id);
        const refRows = blockIds.length > 0
            ? (await db
                .select()
                .from(scriptBlockCharacterRefs)
                .where(inArray(scriptBlockCharacterRefs.blockId, blockIds)))
                .filter(row => characterMap.has(row.characterId))
            : [];

        if (refRows.length > 0) {
            await db.insert(scriptBlockCharacterRefs).values(refRows.map(row => ({
                ...row,
                blockId: blockMap.get(row.blockId)!,
                characterId: characterMap.get(row.characterId)!,
            })));
        }
    }

    if (copySettings) {
        await duplicateSettings(db, sourceScriptId, targetScriptId, now);
    }
};

const duplicateSettings = async (
    db: DbClient,
    sourceScriptId: string,
    targetScriptId: string,
    now: number,
): Promise<void> => {
    const pageLayoutRows = await db
        .select()
        .from(scriptSettingsPageLayout)
        .where(eq(scriptSettingsPageLayout.scriptId, sourceScriptId));

    if (pageLayoutRows.length > 0) {
        await db.insert(scriptSettingsPageLayout).values(pageLayoutRows.map(row => ({
            ...row,
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }

    const visualRows = await db
        .select()
        .from(scriptSettingsVisualPreferences)
        .where(eq(scriptSettingsVisualPreferences.scriptId, sourceScriptId));

    if (visualRows.length > 0) {
        await db.insert(scriptSettingsVisualPreferences).values(visualRows.map(row => ({
            ...row,
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }

    const structureRows = await db
        .select()
        .from(scriptSettingsStructure)
        .where(eq(scriptSettingsStructure.scriptId, sourceScriptId));

    if (structureRows.length > 0) {
        await db.insert(scriptSettingsStructure).values(structureRows.map(row => ({
            ...row,
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }

    const initialPagesRows = await db
        .select()
        .from(scriptSettingsInitialPages)
        .where(eq(scriptSettingsInitialPages.scriptId, sourceScriptId));

    if (initialPagesRows.length > 0) {
        await db.insert(scriptSettingsInitialPages).values(initialPagesRows.map(row => ({
            ...row,
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }

    const headerFooterRows = await db
        .select()
        .from(scriptSettingsHeadersFooters)
        .where(eq(scriptSettingsHeadersFooters.scriptId, sourceScriptId));

    if (headerFooterRows.length > 0) {
        await db.insert(scriptSettingsHeadersFooters).values(headerFooterRows.map(row => ({
            ...row,
            id: uuidv7(),
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }

    const blockSettingsRows = await db
        .select()
        .from(scriptSettingsBlocks)
        .where(eq(scriptSettingsBlocks.scriptId, sourceScriptId));

    if (blockSettingsRows.length > 0) {
        await db.insert(scriptSettingsBlocks).values(blockSettingsRows.map(row => ({
            ...row,
            id: uuidv7(),
            scriptId: targetScriptId,
            createdAt: now,
            updatedAt: now,
        })));
    }
};
