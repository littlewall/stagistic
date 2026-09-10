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
    scriptCharacterGroupMembers,
    scriptCharacters,
    scriptScenes,
    scriptSettingsInitialPages,
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
 * Seeds a source script with an act, a scene, three blocks (one heading), a
 * confirmed character and group with block refs, and a structure settings row.
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
        },
        {
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
        {
            id: 'block-3',
            scriptId: SOURCE_ID,
            blockType: 'stageDirection',
            blockOrder: 'a2',
            textContent: 'ALL enter.',
            contentJson: JSON.stringify([
                {
                    type: 'text',
                    text: 'ALL',
                    marks: [{type: 'characterTag', attrs: {characterKey: 'ALL', characterId: 'group-1'}}],
                },
                {
                    type: 'text',
                    text: ' UNKNOWN',
                    marks: [{type: 'characterTag', attrs: {characterKey: 'UNKNOWN', characterId: 'missing-entity'}}],
                },
                {type: 'text', text: ' enter.'},
            ]),
            sceneId: 'scene-1',
            actId: 'act-1',
            createdAt: 1,
            updatedAt: 1,
        },
    ]);
    await db.insert(scriptCharacters).values([
        {
            id: 'char-1',
            scriptId: SOURCE_ID,
            characterKey: 'ANNA',
            colorHex: '#ff0000',
            createdAt: 1,
            updatedAt: 1,
        }, {
            id: 'group-1',
            scriptId: SOURCE_ID,
            characterKey: 'ALL',
            kind: 'group',
            colorHex: '#00ff00',
            createdAt: 1,
            updatedAt: 1,
        },
    ]);
    await db.insert(scriptCharacterGroupMembers).values({groupId: 'group-1', characterId: 'char-1'});
    await db.insert(scriptBlockCharacterRefs).values([
        {
            blockId: 'block-2',
            characterId: 'char-1',
            characterKey: 'ANNA',
            isConfirmed: true,
        }, {
            blockId: 'block-3',
            characterId: 'group-1',
            characterKey: 'ALL',
            isConfirmed: true,
        },
    ]);
    await db.insert(scriptSettingsStructure).values({
        scriptId: SOURCE_ID,
        actLinesBefore: 3,
        actLinesAfter: 2,
        createdAt: 1,
        updatedAt: 1,
    });
    await db.insert(scriptSettingsInitialPages).values({
        scriptId: SOURCE_ID,
        castOrderBy: 'appearance',
        showOutline: false,
        showCharactersInSongs: true,
        createdAt: 1,
        updatedAt: 1,
    });
};

const listTarget = async (db: TestDb) => {
    const blocks = await db.select().from(scriptBlocks).where(eq(scriptBlocks.scriptId, TARGET_ID));
    const acts = await db.select().from(scriptActs).where(eq(scriptActs.scriptId, TARGET_ID));
    const scenes = await db.select().from(scriptScenes).where(eq(scriptScenes.scriptId, TARGET_ID));
    const characters = await db.select().from(scriptCharacters).where(eq(scriptCharacters.scriptId, TARGET_ID));
    const characterIds = new Set(characters.map(character => character.id));
    const memberships = (await db.select().from(scriptCharacterGroupMembers))
        .filter(row => characterIds.has(row.groupId));
    const structure = await db
        .select()
        .from(scriptSettingsStructure)
        .where(eq(scriptSettingsStructure.scriptId, TARGET_ID));
    const initialPages = await db
        .select()
        .from(scriptSettingsInitialPages)
        .where(eq(scriptSettingsInitialPages.scriptId, TARGET_ID));

    return {
        blocks, acts, scenes, characters, memberships, structure, initialPages,
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
            blocks, acts, scenes, structure, characters, initialPages,
        } = await listTarget(db);

        expect(blocks).toHaveLength(3);
        expect(acts).toHaveLength(1);
        expect(scenes).toHaveLength(1);

        // Ids are regenerated (not the source ids).
        expect(blocks.every(block => block.id !== 'block-1' && block.id !== 'block-2')).toBe(true);
        expect(acts[0]?.id).not.toBe('act-1');

        // Cross-references point at the new block/scene/act ids.
        const headingBlock = blocks.find(block => block.blockType === 'sceneHeading');

        /*
         * Without this the two assertions below compare undefined to undefined
         * and pass even when the duplicate carries no heading cross-references
         * at all.
         */
        expect(headingBlock?.id).toEqual(expect.any(String));
        expect(acts[0]?.headingBlockId).toBe(headingBlock?.id);
        expect(scenes[0]?.headingBlockId).toBe(headingBlock?.id);
        expect(blocks.every(block => block.sceneId === scenes[0]?.id)).toBe(true);
        expect(blocks.every(block => block.actId === acts[0]?.id)).toBe(true);

        // Flags off: no settings, no characters.
        expect(structure).toHaveLength(0);
        expect(initialPages).toHaveLength(0);
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

        const {structure, initialPages} = await listTarget(db);

        expect(structure).toHaveLength(1);
        expect(structure[0]?.actLinesBefore).toBe(3);
        expect(structure[0]?.actLinesAfter).toBe(2);
        expect(initialPages[0]).toMatchObject({
            castOrderBy: 'appearance',
            showOutline: false,
            showCharactersInSongs: true,
        });
    });

    it('copies speaking entities, memberships, refs, and inline tag ids with attributes', async () => {
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

        const {
            characters, memberships, blocks,
        } = await listTarget(db);
        const character = characters.find(row => row.kind === 'character');
        const group = characters.find(row => row.kind === 'group');

        expect(characters).toHaveLength(2);
        expect(character).toMatchObject({characterKey: 'ANNA', kind: 'character'});
        expect(group).toMatchObject({characterKey: 'ALL', kind: 'group'});
        expect(character?.id).not.toBe('char-1');
        expect(group?.id).not.toBe('group-1');
        expect(memberships).toEqual([{groupId: group?.id, characterId: character?.id}]);

        const dialogueBlock = blocks.find(block => block.blockType === 'dialogue');
        const characterRefs = await db
            .select()
            .from(scriptBlockCharacterRefs)
            .where(and(
                eq(scriptBlockCharacterRefs.blockId, dialogueBlock!.id),
                eq(scriptBlockCharacterRefs.characterId, character!.id),
            ));

        expect(characterRefs).toHaveLength(1);
        expect(characterRefs[0]?.isConfirmed).toBe(true);

        const groupBlock = blocks.find(block => block.blockType === 'stageDirection');
        const groupRefs = await db
            .select()
            .from(scriptBlockCharacterRefs)
            .where(and(
                eq(scriptBlockCharacterRefs.blockId, groupBlock!.id),
                eq(scriptBlockCharacterRefs.characterId, group!.id),
            ));
        const inline = JSON.parse(groupBlock!.contentJson!) as Array<{
            text?: string,
            marks?: Array<{attrs?: {characterId?: string | null}}>,
        }>;

        expect(groupRefs).toHaveLength(1);
        expect(inline[0]).toMatchObject({text: 'ALL', marks: [{attrs: {characterId: group?.id}}]});
        expect(inline[1]).toMatchObject({text: ' UNKNOWN', marks: [{attrs: {characterId: null}}]});
    });

    it('drops entities, memberships, refs, and inline tag ids without attributes', async () => {
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
            blocks, characters, memberships,
        } = await listTarget(db);
        const blockIds = blocks.map(block => block.id);
        const allRefs = await db.select().from(scriptBlockCharacterRefs);
        const targetRefs = allRefs.filter(ref => blockIds.includes(ref.blockId));
        const groupBlock = blocks.find(block => block.blockType === 'stageDirection');
        const inline = JSON.parse(groupBlock!.contentJson!) as Array<{
            text?: string,
            marks?: Array<{attrs?: {characterId?: string | null}}>,
        }>;

        expect(characters).toHaveLength(0);
        expect(memberships).toHaveLength(0);
        expect(targetRefs).toHaveLength(0);
        expect(inline[0]).toMatchObject({text: 'ALL', marks: [{attrs: {characterId: null}}]});
    });
});
