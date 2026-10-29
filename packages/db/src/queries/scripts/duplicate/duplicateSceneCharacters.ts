import {scriptSceneCharacters} from '../../../schema';
import type {DbClient} from '../../types';
import {listSceneCharacters} from '../sceneCharacters';

export const duplicateSceneCharacters = async (db: DbClient, {
    sourceScriptId,
    targetScriptId,
    blockMap,
    entityIdMap,
    now,
}: {
    sourceScriptId: string,
    targetScriptId: string,
    blockMap: ReadonlyMap<string, string>,
    entityIdMap: ReadonlyMap<string, string>,
    now: number,
}) => {
    const rows = await listSceneCharacters(db, sourceScriptId);
    const copies = rows.flatMap(row => {
        const headingBlockId = blockMap.get(row.headingBlockId);
        const characterId = entityIdMap.get(row.characterId);

        return headingBlockId && characterId ? [
            {
                ...row,
                scriptId: targetScriptId,
                headingBlockId,
                characterId,
                createdAt: now,
                updatedAt: now,
            },
        ] : [];
    });

    if (copies.length) await db.insert(scriptSceneCharacters).values(copies);
};
