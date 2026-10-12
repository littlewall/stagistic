import {
    and,
    eq,
    inArray,
    ne,
} from 'drizzle-orm';

import {
    scriptLocations,
    scriptSceneLocations,
    scriptScenes,
} from '../../../schema';
import {
    existingIds,
    ids,
    num,
    str,
    type Upserts,
    type WriteContext,
} from './shared';

export const writeLocations = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    for (const [id, record] of Object.entries(upserts)) {
        if (!record) {
            await tx.delete(scriptLocations).where(and(eq(scriptLocations.scriptId, scriptId), eq(scriptLocations.id, id)));
            continue;
        }

        const name = str(record.name);
        const taken = name !== null && (await tx
            .select({id: scriptLocations.id})
            .from(scriptLocations)
            .where(and(eq(scriptLocations.scriptId, scriptId), eq(scriptLocations.name, name), ne(scriptLocations.id, id)))).length > 0;

        if (name === null || taken) {
            continue;
        }

        const fields = {
            name,
            description: str(record.description),
            updatedAt: now,
        };

        await tx
            .insert(scriptLocations)
            .values({
                id,
                scriptId,
                ...fields,
                createdAt: num(record.createdAt, now),
            })
            .onConflictDoUpdate({
                target: scriptLocations.id,
                set: fields,
                // Ids are global: never take over another script's row.
                setWhere: eq(scriptLocations.scriptId, scriptId),
            });
    }
};

export const writeScenes = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    const headingIds = Object.keys(upserts);

    if (headingIds.length === 0) {
        return;
    }

    const scenes = await tx
        .select({id: scriptScenes.id, headingBlockId: scriptScenes.headingBlockId})
        .from(scriptScenes)
        .where(and(eq(scriptScenes.scriptId, scriptId), inArray(scriptScenes.headingBlockId, headingIds)));
    const locations = await existingIds(tx, scriptLocations, scriptId);

    for (const scene of scenes) {
        const record = upserts[scene.headingBlockId!] ?? null;
        const locationId = str(record?.locationId);

        await tx.update(scriptScenes).set({
            colorHex: str(record?.colorHex),
            synopsis: str(record?.synopsis),
            locationId: locationId !== null && locations.has(locationId) ? locationId : null,
            updatedAt: now,
        }).where(eq(scriptScenes.id, scene.id));
        await tx.delete(scriptSceneLocations).where(eq(scriptSceneLocations.sceneId, scene.id));

        const locationIds = ids(record?.locationIds).filter(id => locations.has(id));

        if (locationIds.length > 0) {
            await tx.insert(scriptSceneLocations).values(locationIds.map(id => ({sceneId: scene.id, locationId: id})));
        }
    }
};
