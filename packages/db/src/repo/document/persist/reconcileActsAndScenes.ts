import {eq} from 'drizzle-orm';

import type {ExtractedActRow, ExtractedSceneRow} from '../../../blocks';
import {
    bulkDeleteScriptActs,
    bulkDeleteScriptScenes,
    bulkUpsertScriptActs,
    bulkUpsertScriptScenes,
    type DbClient,
} from '../../../queries';
import {scriptActs, scriptScenes} from '../../../schema';

/**
 * Structural save: upsert the document's acts and scenes and delete the ones
 * that disappeared. Existing scene metadata (color, synopsis, location) is kept.
 */
export const reconcileActsAndScenes = async (
    tx: DbClient,
    scriptId: string,
    {acts, scenes}: {acts: readonly ExtractedActRow[], scenes: readonly ExtractedSceneRow[]},
    now: number,
) => {
    const existingActs = await tx.select({id: scriptActs.id}).from(scriptActs).where(eq(scriptActs.scriptId, scriptId));
    const nextActIds = new Set(acts.map(act => act.id));

    await bulkUpsertScriptActs(
        tx,
        acts.map(act => ({
            id: act.id,
            scriptId,
            headingBlockId: act.headingBlockId,
            name: act.name,
            createdAt: now,
            updatedAt: now,
        })),
    );

    await bulkDeleteScriptActs(
        tx,
        existingActs.filter(act => !nextActIds.has(act.id)).map(act => act.id),
    );

    const existingScenes = await tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId));
    const existingSceneByHeading = new Map(existingScenes.filter(scene => scene.headingBlockId).map(scene => [scene.headingBlockId as string, scene] as const));
    const nextSceneIds = new Set(scenes.map(scene => scene.id));

    await bulkUpsertScriptScenes(
        tx,
        scenes.map(scene => {
            const prev = existingSceneByHeading.get(scene.headingBlockId) ?? null;

            return {
                id: scene.id,
                scriptId,
                headingBlockId: scene.headingBlockId,
                sceneNumber: scene.sceneNumber,
                colorHex: prev?.colorHex ?? null,
                synopsis: prev?.synopsis ?? null,
                locationId: prev?.locationId ?? null,
                createdAt: prev?.createdAt ?? now,
                updatedAt: now,
            };
        }),
    );

    await bulkDeleteScriptScenes(
        tx,
        existingScenes.filter(scene => !nextSceneIds.has(scene.id)).map(scene => scene.id),
    );
};
