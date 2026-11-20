import {
    and,
    eq,
    inArray,
} from 'drizzle-orm';

import {
    scriptDetachedScenes,
    scriptLocations,
    scriptSceneLocations,
} from '../../schema';
import type {ScriptScene} from '../../types';
import type {DbClient} from '../types';
import {replaceScriptSceneLocations} from './sceneLocations';

export const detachSceneMetadata = async (db: DbClient, scenes: readonly ScriptScene[], now: number) => {
    if (scenes.length === 0) return;

    const assignments = await db.select().from(scriptSceneLocations).where(inArray(scriptSceneLocations.sceneId, scenes.map(scene => scene.id)));
    const rows = scenes.flatMap(scene => {
        const locationIds = assignments.filter(row => row.sceneId === scene.id).map(row => row.locationId);

        if (!scene.headingBlockId || !(scene.synopsis || scene.colorHex || scene.locationId || locationIds.length)) return [];

        return [
            {
                scriptId: scene.scriptId,
                headingBlockId: scene.headingBlockId,
                synopsis: scene.synopsis,
                colorHex: scene.colorHex,
                locationId: scene.locationId,
                locationIds,
                detachedAt: now,
            },
        ];
    });

    if (rows.length) await db.insert(scriptDetachedScenes).values(rows).onConflictDoNothing();
};

export const readDetachedScenes = async (db: DbClient, scriptId: string) => {
    const rows = await db.select().from(scriptDetachedScenes).where(eq(scriptDetachedScenes.scriptId, scriptId));

    if (!rows.length) return new Map<string, typeof rows[number]>();

    const locations = await db.select({id: scriptLocations.id}).from(scriptLocations).where(eq(scriptLocations.scriptId, scriptId));
    const valid = new Set(locations.map(row => row.id));

    return new Map(rows.map(row => [
        row.headingBlockId,
        {
            ...row,
            locationId: row.locationId && valid.has(row.locationId) ? row.locationId : null,
        },
    ]));
};

export const restoreDetachedSceneLocations = async (db: DbClient, scriptId: string, headings: readonly string[]) => {
    if (!headings.length) return;

    const rows = await db.select().from(scriptDetachedScenes).where(and(
        eq(scriptDetachedScenes.scriptId, scriptId),
        inArray(scriptDetachedScenes.headingBlockId, [...headings]),
    ));

    for (const row of rows) {
        await replaceScriptSceneLocations(db, {
            scriptId,
            sceneHeadingBlockId: row.headingBlockId,
            locationIds: row.locationIds,
        });
    }

    await db.delete(scriptDetachedScenes).where(and(eq(scriptDetachedScenes.scriptId, scriptId), inArray(scriptDetachedScenes.headingBlockId, [...headings])));
};
