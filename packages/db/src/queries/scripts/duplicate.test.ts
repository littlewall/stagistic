import {
    and,
    eq,
} from 'drizzle-orm';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    scriptActs,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptCharacters,
    scriptScenes,
    scriptSettingsStructure,
} from '../../schema';
import {
    createTestDb,
    seedScript,
    type TestDb,
} from '../../testing/createTestDb';
import {duplicateScriptRows} from './duplicate';

const SOURCE_ID = 'source-script';
const TARGET_ID = 'target-script';

/**
 * Seeds a source script with an act, a scene, two blocks (one heading), a
 * confirmed character with a block ref, and a structure settings row.
 */
const seedSource = async (db: TestDb): Promise<void> => {
    await seedScript(db, SOURCE_ID);

    await db.insert(scriptActs).values({
        id: 'act-1',
        scriptId: SOURCE_ID,
        headingBlockId: 'block-1',
        name: 'Act I',
        createdAt: 1,
        updatedAt: 1,
    });
    await db.insert(scriptScenes).values({
        id: 'scene-1',
        scriptId: SOURCE_ID,
        headingBlockId: 'block-1',
        sceneNumber: '1',
        createdAt: 1,
        updatedAt: 1,
    });
    await db.insert(scriptBlocks).values([
        {
            id: 'block-1',
            scriptId: SOURCE_ID,
            blockType: 'sceneHeading',
            blockOrder: 'a0',
            textContent: 'SCENE 1',
            sceneId: 'scene-1',
            actId: 'act-1',
            createdAt: 1,
            updatedAt: 1,
        }, {
            id: 'block-2',
            scriptId: SOURCE_ID,
            blockType: 'dialogue',
            blockOrder: 'a1',
            textContent: 'ANNA speaks',
            sceneId: 'scene-1',
            actId: 'act-1',
            createdAt: 1,
            updatedAt: 1,
        },
    ]);
    await db.insert(scriptCharacters).values({
        id: 'char-1',
        scriptId: SOURCE_ID,
        characterKey: 'ANNA',
        colorHex: '#ff0000',
        createdAt: 1,
        updatedAt: 1,
    });
    await db.insert(scriptBlockCharacterRefs).values({
        blockId: 'block-2',
        characterId: 'char-1',
        characterKey: 'ANNA',
        isConfirmed: true,
    });
    await db.insert(scriptSettingsStructure).values({
        scriptId: SOURCE_ID,
        actLinesBefore: 3,
        actLinesAfter: 2,
        createdAt: 1,
        updatedAt: 1,
    });
};

const listTarget = async (db: TestDb) => {
    const blocks = await db.select().from(scriptBlocks).where(eq(scriptBlocks.scriptId, TARGET_ID));
    const acts = await db.select().from(scriptActs).where(eq(scriptActs.scriptId, TARGET_ID));
    const scenes = await db.select().from(scriptScenes).where(eq(scriptScenes.scriptId, TARGET_ID));
    const characters = await db.select().from(scriptCharacters).where(eq(scriptCharacters.scriptId, TARGET_ID));
    const structure = await db
        .select()
        .from(scriptSettingsStructure)
        .where(eq(scriptSettingsStructure.scriptId, TARGET_ID));

    return {
        blocks, acts, scenes, characters, structure,
    };
};

describe('duplicateScriptRows', () => {
    it('copies content with fresh ids and remapped references', async () => {
        const {db} = await createTestDb();

        await seedSource(db);
        await duplicateScriptRows(db, {
            sourceScriptId: SOURCE_ID,
            targetScriptId: TARGET_ID,
            title: 'Copy',
            now: 100,
            copySettings: false,
            copyAttributes: false,
        });

        const {
            blocks, acts, scenes, structure, characters,
        } = await listTarget(db);

        expect(blocks).toHaveLength(2);
        expect(acts).toHaveLength(1);
        expect(scenes).toHaveLength(1);

        // Ids are regenerated (not the source ids).
        expect(blocks.every(block => block.id !== 'block-1' && block.id !== 'block-2')).toBe(true);
        expect(acts[0]?.id).not.toBe('act-1');

        // Cross-references point at the new block/scene/act ids.
        const headingBlock = blocks.find(block => block.blockType === 'sceneHeading');

        expect(acts[0]?.headingBlockId).toBe(headingBlock?.id);
        expect(scenes[0]?.headingBlockId).toBe(headingBlock?.id);
        expect(blocks.every(block => block.sceneId === scenes[0]?.id)).toBe(true);
        expect(blocks.every(block => block.actId === acts[0]?.id)).toBe(true);

        // Flags off: no settings, no characters.
        expect(structure).toHaveLength(0);
        expect(characters).toHaveLength(0);
    });

    it('copies settings only when copySettings is set', async () => {
        const {db} = await createTestDb();

        await seedSource(db);
        await duplicateScriptRows(db, {
            sourceScriptId: SOURCE_ID,
            targetScriptId: TARGET_ID,
            title: 'Copy',
            now: 100,
            copySettings: true,
            copyAttributes: false,
        });

        const {structure} = await listTarget(db);

        expect(structure).toHaveLength(1);
        expect(structure[0]?.actLinesBefore).toBe(3);
        expect(structure[0]?.actLinesAfter).toBe(2);
    });

    it('copies characters and remapped refs only when copyAttributes is set', async () => {
        const {db} = await createTestDb();

        await seedSource(db);
        await duplicateScriptRows(db, {
            sourceScriptId: SOURCE_ID,
            targetScriptId: TARGET_ID,
            title: 'Copy',
            now: 100,
            copySettings: false,
            copyAttributes: true,
        });

        const {characters, blocks} = await listTarget(db);

        expect(characters).toHaveLength(1);
        expect(characters[0]?.id).not.toBe('char-1');
        expect(characters[0]?.characterKey).toBe('ANNA');

        const dialogueBlock = blocks.find(block => block.blockType === 'dialogue');
        const refs = await db
            .select()
            .from(scriptBlockCharacterRefs)
            .where(and(
                eq(scriptBlockCharacterRefs.blockId, dialogueBlock!.id),
                eq(scriptBlockCharacterRefs.characterId, characters[0].id),
            ));

        expect(refs).toHaveLength(1);
        expect(refs[0]?.isConfirmed).toBe(true);
    });

    it('drops character refs when copyAttributes is off', async () => {
        const {db} = await createTestDb();

        await seedSource(db);
        await duplicateScriptRows(db, {
            sourceScriptId: SOURCE_ID,
            targetScriptId: TARGET_ID,
            title: 'Copy',
            now: 100,
            copySettings: false,
            copyAttributes: false,
        });

        const {blocks} = await listTarget(db);
        const blockIds = blocks.map(block => block.id);
        const allRefs = await db.select().from(scriptBlockCharacterRefs);
        const targetRefs = allRefs.filter(ref => blockIds.includes(ref.blockId));

        expect(targetRefs).toHaveLength(0);
    });
});
