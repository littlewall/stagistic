import {
    and,
    asc,
    eq,
    inArray,
} from 'drizzle-orm';

import {
    scriptLocations,
    scriptSceneLocations,
    scriptScenes,
} from '../../schema';
import type {DbClient} from '../types';

export interface ScriptSceneLocationAssignment {
    sceneHeadingBlockId: string,
    locationId: string,
}

export const listScriptSceneLocations = async (
    db: DbClient,
    scriptId: string,
): Promise<ScriptSceneLocationAssignment[]> => {
    const rows = await db
        .select({
            sceneHeadingBlockId: scriptScenes.headingBlockId,
            locationId: scriptSceneLocations.locationId,
        })
        .from(scriptSceneLocations)
        .innerJoin(scriptScenes, eq(scriptSceneLocations.sceneId, scriptScenes.id))
        .where(eq(scriptScenes.scriptId, scriptId))
        .orderBy(asc(scriptScenes.createdAt), asc(scriptSceneLocations.locationId));

    return rows.flatMap(row => {
        if (!row.sceneHeadingBlockId) {
            return [];
        }

        return [
            {
                sceneHeadingBlockId: row.sceneHeadingBlockId,
                locationId: row.locationId,
            },
        ];
    });
};

export const replaceScriptSceneLocations = async (
    db: DbClient,
    payload: {
        scriptId: string,
        sceneHeadingBlockId: string,
        locationIds: string[],
    },
): Promise<string[]> => {
    const sceneRows = await db
        .select({id: scriptScenes.id})
        .from(scriptScenes)
        .where(and(
            eq(scriptScenes.scriptId, payload.scriptId),
            eq(scriptScenes.headingBlockId, payload.sceneHeadingBlockId),
        ))
        .limit(1);
    const sceneId = sceneRows[0]?.id;

    if (!sceneId) {
        return [];
    }

    const uniqueLocationIds = [...new Set(payload.locationIds)];
    const validLocationIds = uniqueLocationIds.length > 0
        ? (await db
            .select({id: scriptLocations.id})
            .from(scriptLocations)
            .where(and(
                eq(scriptLocations.scriptId, payload.scriptId),
                inArray(scriptLocations.id, uniqueLocationIds),
            )))
            .map(row => row.id)
        : [];

    await db.transaction(async tx => {
        await tx
            .delete(scriptSceneLocations)
            .where(eq(scriptSceneLocations.sceneId, sceneId));

        if (validLocationIds.length === 0) {
            return;
        }

        await tx.insert(scriptSceneLocations).values(validLocationIds.map(locationId => ({
            sceneId,
            locationId,
        })));
    });

    return validLocationIds;
};
