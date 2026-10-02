import {
    buildScriptSummaryMetadata,
    type ScriptDocument,
} from '@stagistic/script';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {getScriptSummary, listScripts} from '../../queries';
import {dbSchema} from '../../schema';
import {createTestDb, seedScript} from '../../testing/createTestDb';
import {createContentHandlers} from './content';

const clients: Awaited<ReturnType<typeof createTestDb>>['client'][] = [];
const document = (...types: string[]): ScriptDocument => ({
    type: 'doc',
    content: types.map((type, index) => ({
        type,
        attrs: {id: `block-${index}`},
        content: [],
    })),
});
const setup = async () => {
    const {db, client} = await createTestDb();

    clients.push(client);
    await seedScript(db, 'script-1');

    const deps = {
        getDb: () => Promise.resolve(db),
        recordOutbox: () => Promise.resolve(),
        syncDb: vi.fn(() => Promise.resolve()),
    };

    return {
        db,
        deps,
        content: createContentHandlers(deps),
    };
};

afterEach(async () => {
    await Promise.all(clients.splice(0).map(client => client.close()));
});

describe('saved script summary metadata', () => {
    it('persists the document snapshot and exposes metadata in single and list summaries', async () => {
        const {
            db,
            deps,
            content,
        } = await setup();
        const value = document('scene', 'act', 'scene', 'act');
        const metadata = buildScriptSummaryMetadata(value, 5);

        await content.saveLatest('script-1', value, metadata);

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual(metadata);
        expect((await listScripts(db))[0]?.summaryMetadata).toEqual(metadata);

        const reopened = createContentHandlers(deps);
        const loaded = await reopened.loadLatest('script-1');

        expect(loaded?.content.map(node => node.type)).toEqual([
            'scene',
            'act',
            'scene',
            'act',
        ]);
        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual(metadata);
        expect(deps.syncDb).toHaveBeenCalledOnce();
    });

    it('writes fresh page metadata when the document delta is empty', async () => {
        const {db, content} = await setup();
        const value = document('act', 'scene');

        await content.saveLatest('script-1', value, buildScriptSummaryMetadata(value, 2));
        await content.saveLatest('script-1', value, buildScriptSummaryMetadata(value, 3));

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata?.pageCount).toBe(3);
    });

    it('preserves measured pages on an unchanged save without metadata, including a fresh handler', async () => {
        const {
            db,
            deps,
            content,
        } = await setup();
        const value = document('act', 'scene');
        const metadata = buildScriptSummaryMetadata(value, 4);

        await content.saveLatest('script-1', value, metadata);
        await content.saveLatest('script-1', value);
        await createContentHandlers(deps).saveLatest('script-1', value);

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual(metadata);
    });

    it('refreshes measured pages without changing the edit time or outbox', async () => {
        const {
            db,
            deps,
            content,
        } = await setup();
        const value = document('act', 'scene');

        await content.saveLatest('script-1', value);

        const before = await getScriptSummary(db, 'script-1');

        expect(await content.saveSummaryMetadata('script-1', {
            ...value,
            attrs: {settings: {page: {widthPx: 720}}},
        }, buildScriptSummaryMetadata(value, 3))).toBe(true);

        expect(await getScriptSummary(db, 'script-1')).toEqual({
            ...before,
            summaryMetadata: buildScriptSummaryMetadata(value, 3),
        });
        expect(await db.select().from(dbSchema.syncOutbox)).toEqual([]);
        expect(deps.syncDb).toHaveBeenCalledTimes(2);
    });

    it('skips metadata measured from an older document after a new save', async () => {
        const {db, content} = await setup();
        const old = document('scene');
        const latest = document('act', 'scene', 'scene');

        await content.saveLatest('script-1', latest, buildScriptSummaryMetadata(latest, 5));
        expect(await content.saveSummaryMetadata('script-1', old, buildScriptSummaryMetadata(old, 1))).toBe(false);

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(latest, 5));
    });

    it('preserves known pages when unchanged content is saved from a folded layout', async () => {
        const {db, content} = await setup();
        const value = document('act', 'scene');

        await content.saveLatest('script-1', value, buildScriptSummaryMetadata(value, 5));
        await content.saveLatest('script-1', value, buildScriptSummaryMetadata(value), null);

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata?.pageCount).toBe(5);
    });

    it('accepts the default draft:false added to imported music atoms while rejecting meaningful changes', async () => {
        const {db, content} = await setup();
        const value: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'music-block'},
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'music-1',
                                mode: 'open',
                                title: 'Music',
                                kind: 'song',
                            },
                        },
                    ],
                },
            ],
        };

        await content.saveLatest('script-1', value);

        const editorValue = structuredClone(value);

        editorValue.content[0].content![0].attrs!.draft = false;
        expect(await content.saveSummaryMetadata('script-1', editorValue, buildScriptSummaryMetadata(editorValue, 2))).toBe(true);
        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata?.pageCount).toBe(2);
        editorValue.content[0].content![0].attrs!.draft = true;
        expect(await content.saveSummaryMetadata('script-1', editorValue, buildScriptSummaryMetadata(editorValue, 5))).toBe(false);
        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata?.pageCount).toBe(2);
        editorValue.content[0].content![0].attrs!.draft = false;
        editorValue.content[0].content![0].attrs!.title = 'Changed music';
        await content.saveSummaryMetadata('script-1', editorValue, buildScriptSummaryMetadata(editorValue, 6));
        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata?.pageCount).toBe(2);
    });

    it('derives structure and clears measured pages for callers without metadata', async () => {
        const {db, content} = await setup();
        const first = document('act', 'scene');
        const next = document('scene', 'act', 'act', 'scene');

        await content.saveLatest('script-1', first, buildScriptSummaryMetadata(first, 4));
        await content.saveLatest('script-1', next);

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual({
            pageCount: null,
            sceneCount: 2,
            actSceneCounts: [0, 1],
            unassignedSceneCount: 1,
        });
    });

    it('keeps concurrent saves paired with their own metadata snapshot', async () => {
        const {db, content} = await setup();
        const first = document('act', 'scene');
        const last = document('act', 'scene', 'act', 'scene', 'scene');

        await Promise.all([
            content.saveLatest('script-1', first, buildScriptSummaryMetadata(first, 2)),
            content.saveLatest('script-1', last, buildScriptSummaryMetadata(last, 7)),
        ]);

        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual(buildScriptSummaryMetadata(last, 7));

        const loaded = await content.loadLatest('script-1');

        expect(loaded?.content.map(node => node.type)).toEqual(last.content.map(node => node.type));
    });

    it('rolls back summary metadata and content together when outbox recording fails', async () => {
        const {
            db,
            deps,
            content,
        } = await setup();
        const value = document('scene');
        const savedMetadata = buildScriptSummaryMetadata(value, 2);

        await content.saveLatest('script-1', value, savedMetadata);

        const failing = createContentHandlers({
            ...deps,
            recordOutbox: () => Promise.reject(new Error('outbox failed')),
        });
        const next = document('act', 'scene', 'scene');

        await expect(failing.saveLatest('script-1', next, buildScriptSummaryMetadata(next, 6)))
            .rejects.toThrow('outbox failed');
        expect((await getScriptSummary(db, 'script-1'))?.summaryMetadata).toEqual(savedMetadata);
        expect((await content.loadLatest('script-1'))?.content.map(node => node.type)).toEqual(['scene']);
        expect(deps.syncDb).toHaveBeenCalledOnce();
    });
});
