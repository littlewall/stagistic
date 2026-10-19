import {LocalMcpReadError} from '@stagistic/mcp-contract';
import {asc, eq} from 'drizzle-orm';

import type {DbClient} from '../queries';
import {
    scriptActs,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptCharacters,
    scriptMusic,
    scripts,
    scriptScenes,
} from '../schema';

export const readMcpSnapshot = async (tx: DbClient, scriptId: string) => {
    const [script] = await tx.select().from(scripts).where(eq(scripts.id, scriptId));

    if (!script) {
        throw new LocalMcpReadError('NOT_FOUND');
    }

    const blocks = await tx.select().from(scriptBlocks).where(eq(scriptBlocks.scriptId, scriptId))
        .orderBy(asc(scriptBlocks.blockOrder), asc(scriptBlocks.id));
    const refs = await tx.select({
        blockId: scriptBlockCharacterRefs.blockId,
        characterId: scriptBlockCharacterRefs.characterId,
        characterKey: scriptBlockCharacterRefs.characterKey,
        isConfirmed: scriptBlockCharacterRefs.isConfirmed,
    }).from(scriptBlockCharacterRefs).innerJoin(scriptBlocks, eq(scriptBlocks.id, scriptBlockCharacterRefs.blockId))
        .where(eq(scriptBlocks.scriptId, scriptId))
        .orderBy(asc(scriptBlockCharacterRefs.blockId), asc(scriptBlockCharacterRefs.characterKey));
    const acts = await tx.select().from(scriptActs).where(eq(scriptActs.scriptId, scriptId))
        .orderBy(asc(scriptActs.id));
    const scenes = await tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId))
        .orderBy(asc(scriptScenes.id));
    const characters = await tx.select().from(scriptCharacters).where(eq(scriptCharacters.scriptId, scriptId))
        .orderBy(asc(scriptCharacters.characterKey), asc(scriptCharacters.id));
    const music = await tx.select().from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId))
        .orderBy(asc(scriptMusic.id));

    return {
        script,
        blocks,
        refs,
        acts,
        scenes,
        characters,
        music,
    };
};

export type McpSnapshot = Awaited<ReturnType<typeof readMcpSnapshot>>;
