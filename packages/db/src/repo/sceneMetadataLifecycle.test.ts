import type {ScriptDocument} from '@stagistic/script';
import {eq} from 'drizzle-orm';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createLocalPgliteRepository, InMemoryFileStorage} from '../index';
import {
    scriptDetachedScenes,
    scriptLocations,
    scriptSceneCharacters,
    scriptScenes,
} from '../schema';
import {createTestDb} from '../testing/createTestDb';
import {rebuildScriptProjection} from './document/documentProjection';

const document = (headings: string[]): ScriptDocument => ({
    type: 'doc',
    content: headings.map(id => ({
        type: 'scene',
        attrs: {id},
        content: [{type: 'text', text: id}],
    })),
});
const setup = async () => {
    const {db} = await createTestDb();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });

    await repository.createScriptWithId({
        id: 's1',
        title: 'Test',
        initialContent: document(['h1', 'h2']),
    });
    await repository.confirmScriptCharacterWithId('s1', {id: 'c1', key: 'ANNA'});
    await repository.putSceneCharacter('s1', 'h2', 'c1', {note: 'Leaves', arcValue: -2});
    await repository.updateSceneSynopsis('s1', 'h2', 'Leaving');
    await repository.createScriptLocationWithId('s1', {id: 'l1', name: 'Home'});
    await repository.replaceScriptSceneLocations('s1', 'h2', ['l1']);
    await db.update(scriptScenes).set({colorHex: '#cc3344', locationId: 'l1'}).where(eq(scriptScenes.headingBlockId, 'h2'));

    return {db, repository};
};

describe('scene metadata identity', () => {
    it.each(['incremental', 'rebuild'])('deactivates and restores metadata through %s writes; new headings stay empty', async mode => {
        const {db, repository} = await setup();
        const write = (headings: string[]) => (mode === 'incremental'
            ? repository.saveLatest('s1', document(headings))
            : rebuildScriptProjection({
                db,
                scriptId: 's1',
                document: document(headings),
            }));

        await write(['h1']);
        expect(await repository.listSceneCharacters('s1')).toEqual([]);
        expect(await repository.listScriptSceneLocations('s1')).toEqual([]);
        expect(await db.select().from(scriptSceneCharacters)).toHaveLength(1);
        expect(await db.select().from(scriptDetachedScenes)).toHaveLength(1);
        await write([
            'h1',
            'h2',
            'new-heading',
        ]);
        expect(await repository.listSceneCharacters('s1')).toEqual([
            expect.objectContaining({
                headingBlockId: 'h2',
                note: 'Leaves',
                arcValue: -2,
            }),
        ]);
        expect(await repository.listScriptSceneLocations('s1')).toEqual([{sceneHeadingBlockId: 'h2', locationId: 'l1'}]);

        const scenes = await db.select().from(scriptScenes);

        expect(scenes.find(scene => scene.headingBlockId === 'h2')).toMatchObject({
            synopsis: 'Leaving',
            colorHex: '#cc3344',
            locationId: 'l1',
        });
        expect(scenes.find(scene => scene.headingBlockId === 'new-heading')).toMatchObject({
            synopsis: null,
            colorHex: null,
            locationId: null,
        });
        expect(await db.select().from(scriptDetachedScenes)).toEqual([]);
    });

    it('does not resurrect places deleted while their scene was detached', async () => {
        const {db, repository} = await setup();

        await repository.saveLatest('s1', document(['h1']));
        await db.delete(scriptLocations).where(eq(scriptLocations.id, 'l1'));
        await repository.saveLatest('s1', document(['h1', 'h2']));
        expect(await repository.listScriptSceneLocations('s1')).toEqual([]);
        expect(await repository.listSceneCharacters('s1')).toHaveLength(1);
    });

    it.each(['draft', 'version'] as const)('purges inactive metadata when creating a %s and retains active records', async kind => {
        const {db, repository} = await setup();

        await repository.putSceneCharacter('s1', 'h1', 'c1', {note: 'Waits'});
        await repository.saveLatest('s1', document(['h1']));
        await repository.createScriptSnapshot('s1', {
            id: 'snapshot',
            kind,
            name: 'First',
            payload: new Blob(['snapshot']),
            documentSchemaVersion: 4,
            summaryMetadata: null,
            attachmentStorageKeys: [],
        });
        expect(await db.select().from(scriptDetachedScenes)).toEqual([]);
        expect(await db.select().from(scriptSceneCharacters)).toEqual([expect.objectContaining({headingBlockId: 'h1', note: 'Waits'})]);
        await repository.saveLatest('s1', document(['h1', 'h2']));
        expect((await db.select().from(scriptScenes)).find(row => row.headingBlockId === 'h2')?.synopsis).toBeNull();
    });
    it('duplicates only active records and remaps the heading and character identities', async () => {
        const {repository} = await setup();

        await repository.putSceneCharacter('s1', 'h1', 'c1', {note: 'Waits', arcValue: 3});
        await repository.saveLatest('s1', document(['h1']));

        const copyId = await repository.duplicateScript('s1', {
            title: 'Copy',
            copyAttributes: true,
            copySettings: true,
        });
        const copy = await repository.getScriptPackageSource(copyId);

        expect(copy?.sceneCharacters).toEqual([
            expect.objectContaining({
                note: 'Waits',
                arcValue: 3,
                scriptId: copyId,
            }),
        ]);
        expect(copy?.sceneCharacters[0]?.headingBlockId).toBe(copy?.scenes[0]?.headingBlockId);
        expect(copy?.sceneCharacters[0]?.headingBlockId).not.toBe('h1');
        expect(copy?.sceneCharacters[0]?.characterId).toBe(copy?.characters[0]?.id);
        expect(copy?.sceneCharacters[0]?.characterId).not.toBe('c1');

        const withoutAttributes = await repository.duplicateScript('s1', {
            title: 'Text',
            copyAttributes: false,
            copySettings: false,
        });

        expect(await repository.listSceneCharacters(withoutAttributes)).toEqual([]);
    });
    it('keeps the card record when all script evidence leaves a surviving scene', async () => {
        const {repository} = await setup();
        const withCue: ScriptDocument = {
            type: 'doc',
            content: [
                ...document(['h1', 'h2']).content,
                {
                    type: 'character',
                    attrs: {id: 'cue', characterRefs: {ANNA: 'c1'}},
                    content: [{type: 'text', text: 'ANNA'}],
                },
                {
                    type: 'dialogue',
                    attrs: {id: 'line'},
                    content: [{type: 'text', text: 'Goodbye.'}],
                },
            ],
        };

        await repository.saveLatest('s1', withCue);

        const before = await repository.listSceneCharacters('s1');

        await repository.saveLatest('s1', document(['h1', 'h2']));
        expect(await repository.listSceneCharacters('s1')).toEqual(before);
    });

    it('rolls metadata cleanup back when snapshot creation fails', async () => {
        const {db, repository} = await setup();
        const input = {
            id: 'snapshot',
            kind: 'draft' as const,
            payload: new Blob(['snapshot']),
            documentSchemaVersion: 4,
            summaryMetadata: null,
            attachmentStorageKeys: [],
        };

        await repository.createScriptSnapshot('s1', input);
        await repository.saveLatest('s1', document(['h1']));
        await expect(repository.createScriptSnapshot('s1', input)).rejects.toThrow();
        expect(await db.select().from(scriptDetachedScenes)).toHaveLength(1);
        expect(await db.select().from(scriptSceneCharacters)).toHaveLength(1);
    });
});
