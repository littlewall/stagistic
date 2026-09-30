import {eq} from 'drizzle-orm';

import type {ExtractedMusicRow} from '../../blocks';
import {
    bulkUnassignScriptMusic,
    bulkUpsertScriptMusic,
    type DbClient,
} from '../../queries';
import {scriptMusic} from '../../schema';

/** Identity of the derived music list; unchanged signature means nothing to reconcile. */
export const getMusicSignature = (music: readonly ExtractedMusicRow[]) => music
    .map(
        item => `${item.id}:${item.sceneNumber}:${item.indexInScene}:${item.mode}:${item.title}:${item.kind ?? ''}:${item.startBlockId}:${item.endBlockId ?? ''}`,
    )
    .join('|');

/** Upserts derived music rows and unassigns rows no longer present in the document. */
export const reconcileScriptMusic = async (tx: DbClient, scriptId: string, music: readonly ExtractedMusicRow[], now: number) => {
    const existingMusic = await tx.select({id: scriptMusic.id}).from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId));
    const nextMusicIds = new Set(music.map(item => item.id));

    await bulkUpsertScriptMusic(
        tx,
        music.map(item => ({
            id: item.id,
            scriptId,
            sceneNumber: item.sceneNumber,
            indexInScene: item.indexInScene,
            mode: item.mode,
            title: item.title,
            kind: item.kind,
            startBlockId: item.startBlockId,
            endBlockId: item.endBlockId,
            createdAt: now,
            updatedAt: now,
        })),
    );
    await bulkUnassignScriptMusic(
        tx,
        existingMusic.filter(row => !nextMusicIds.has(row.id)).map(row => row.id),
        now,
    );
};
