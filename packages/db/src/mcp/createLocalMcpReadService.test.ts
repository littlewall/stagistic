import {parseStagistic} from '@stagistic/script';
import {eq} from 'drizzle-orm';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {rebuildScriptProjection} from '../repo/document/documentProjection';
import {
    scriptBlocks,
    scriptCharacters,
    scripts,
    scriptScenes,
    syncOutbox,
} from '../schema';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {createLocalMcpReadService} from './createLocalMcpReadService';

const fixture = async () => {
    const {db, client} = await createTestDb();

    await seedScript(db, 's');
    await seedScript(db, 'other');
    await rebuildScriptProjection({
        db,
        scriptId: 's',
        document: parseStagistic('An empty stage.\n\n# Act I\n\n## Kitchen\n\n@ALICE / BOB\nČervený zvonek.\n!They sit.\nAgain.\n\n## Kitchen\n\nThe door.').document,
    });

    const service = createLocalMcpReadService({getDb: () => Promise.resolve(db)});

    return {
        db,
        client,
        service,
    };
};

describe('local MCP read service', () => {
    it('ends a scene at the following act even when stored projection IDs retain the old scene', async () => {
        const {
            db,
            client,
            service,
        } = await fixture();

        await rebuildScriptProjection({
            db,
            scriptId: 's',
            document: parseStagistic('# Act I\n\n## First\n\nA lamp.\n\n# Act II\n\nFuture preamble.\n\n## Second\n\nA door.').document,
        });

        const outline = await service.execute({tool: 'get_script_outline', arguments: {script_id: 's'}});
        const first = outline.items.find(item => item && typeof item === 'object' && 'title' in item && item.title === 'First') as {id: string};
        const scene = await service.execute({tool: 'get_scene', arguments: {script_id: 's', scene_id: first.id}});
        const search = await service.execute({
            tool: 'search_script',
            arguments: {
                script_id: 's',
                scene_id: first.id,
                query: 'Future',
            },
        });

        expect(JSON.stringify(scene.items)).not.toContain('Act II');
        expect(JSON.stringify(scene.items)).not.toContain('Future preamble.');
        expect(search.items).toEqual([]);
        await client.close();
    });
    it('keeps aborted work in the concurrency budget until the pending database operation finishes', async () => {
        const {db, client} = await createTestDb();
        let release!: () => void;
        const gate = new Promise<void>(resolve => {
            release = resolve;
        });
        const service = createLocalMcpReadService({getDb: async () => {
            await gate;

            return db;
        }});
        const abort = new AbortController();
        const operation = {tool: 'list_scripts' as const, arguments: {}};
        const pending = Array.from({length: 8}, () => service.execute(operation, abort.signal));
        const settled = Promise.allSettled(pending);

        await expect(service.execute(operation)).rejects.toMatchObject({code: 'BUSY'});
        abort.abort();
        await expect(service.execute(operation)).rejects.toMatchObject({code: 'BUSY'});
        release();
        await settled;
        expect((await service.execute(operation)).items).toEqual([]);
        await client.close();
    });
    it('distinguishes unconfirmed speakers and returns complete confirmed dialogue only once', async () => {
        const {
            db,
            client,
            service,
        } = await fixture();

        await db.insert(scriptCharacters).values({
            id: 'alice',
            scriptId: 's',
            characterKey: 'ALICE',
            createdAt: 1,
            updatedAt: 1,
        });

        const {document} = parseStagistic('@ALICE / BOB\nHello.\n!They sit.\nAgain.\n\n@ALICE\nUnconfirmed.');

        document.content[0].attrs = {...document.content[0].attrs, characterRefs: {ALICE: 'alice'}};
        await rebuildScriptProjection({
            db,
            scriptId: 's',
            document,
        });

        const characters = await service.execute({tool: 'get_characters', arguments: {script_id: 's'}});
        const speech = await service.execute({tool: 'get_character_dialogue', arguments: {script_id: 's', character_id: 'alice'}});

        expect(characters.items).toContainEqual(expect.objectContaining({
            character_key: 'BOB',
            character_id: null,
            confirmed: false,
        }));
        expect(characters.items).toContainEqual(expect.objectContaining({
            character_key: 'ALICE',
            character_id: null,
            confirmed: false,
        }));
        expect(speech.items).toHaveLength(1);
        expect(JSON.stringify(speech.items)).toContain('!They sit.');
        await client.close();
    });
    it('reads summaries, stable scene identities, context and preamble without mutations', async () => {
        const {
            db,
            client,
            service,
        } = await fixture();
        const before = await db.select().from(scripts);
        const outbox = await db.select().from(syncOutbox);
        const list = await service.execute({tool: 'list_scripts', arguments: {}});
        const outline = await service.execute({tool: 'get_script_outline', arguments: {script_id: 's'}});
        const [scene] = await db.select().from(scriptScenes).where(eq(scriptScenes.scriptId, 's'));
        const text = await service.execute({tool: 'get_scene', arguments: {script_id: 's', scene_id: scene.id}});
        const preamble = await service.execute({tool: 'get_script_excerpt', arguments: {script_id: 's', limit: 1}});

        expect(list.items).toHaveLength(2);
        expect(outline.items).toHaveLength(3);
        expect(outline.items[1]).toMatchObject({
            scene_number: '1',
            block_count: 5,
            dialogue_count: 2,
        });
        expect(JSON.stringify(text.items)).toContain('## Kitchen');
        expect(JSON.stringify(preamble.items)).toContain('An empty stage.');
        expect(await db.select().from(scripts)).toEqual(before);
        expect(await db.select().from(syncOutbox)).toEqual(outbox);
        await expect(service.execute({tool: 'get_scene', arguments: {script_id: 'other', scene_id: scene.id}})).rejects.toMatchObject({code: 'NOT_FOUND'});
        await client.close();
    });

    it('invalidates a cursor when content changes without a timestamp change', async () => {
        const {
            db,
            client,
            service,
        } = await fixture();
        const first = await service.execute({tool: 'get_script_excerpt', arguments: {script_id: 's', limit: 1}});

        expect(first.next_cursor).toBeTruthy();
        await db.update(scriptBlocks).set({textContent: 'Changed.'}).where(eq(scriptBlocks.scriptId, 's'));
        await expect(service.execute({tool: 'get_script_excerpt', arguments: {script_id: 's', cursor: first.next_cursor}})).rejects.toMatchObject({code: 'STALE_CURSOR'});
        await client.close();
    });

    it('searches current text within the script and reflects edits and deletion', async () => {
        const {
            db,
            client,
            service,
        } = await fixture();
        const op = {tool: 'search_script' as const, arguments: {script_id: 's', query: 'červený zvonek'}};
        const found = await service.execute(op);

        expect(found.items).toHaveLength(1);
        expect(JSON.stringify(found.items)).toContain('Červený zvonek.');
        expect((await service.execute({...op, arguments: {...op.arguments, script_id: 'other'}})).items).toEqual([]);
        await db.update(scriptBlocks).set({textContent: 'Blue bell.'}).where(eq(scriptBlocks.scriptId, 's'));
        expect((await service.execute(op)).items).toEqual([]);
        await db.delete(scriptBlocks).where(eq(scriptBlocks.scriptId, 's'));
        expect((await service.execute(op)).items).toEqual([]);
        await client.close();
    });
});
