import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../fileStorage';
import {dbSchema} from '../schema';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {createAttachmentHandlers} from './attachments';
import {createCharacterHandlers} from './characters';
import {createSettingsHandlers} from './config';
import {createCueHandlers} from './cues';
import {createLocationHandlers} from './locations';
import {createScriptsHandlers} from './scripts';
import {createTitlePageHandlers} from './titlePage';
import type {RecordOutbox} from './types';

const outboxFailure = new Error('outbox failed');
const failingOutbox: RecordOutbox = (_payload, db) => {
    expect(db).toBeDefined();

    return Promise.reject(outboxFailure);
};

const setup = async () => {
    const {db} = await createTestDb();
    const syncDb = vi.fn(() => Promise.resolve());

    await seedScript(db, 'script-1');

    const [script] = await db.select().from(dbSchema.scripts);

    return {
        db,
        getDb: () => Promise.resolve(db),
        initialUpdatedAt: script.updatedAt,
        syncDb,
    };
};

const expectScriptTimestamp = async (
    db: Awaited<ReturnType<typeof createTestDb>>['db'],
    expectedUpdatedAt: number,
) => {
    const [script] = await db.select().from(dbSchema.scripts);

    expect(script.updatedAt).toBe(expectedUpdatedAt);
};

describe('atomic domain write and outbox recording', () => {
    it('rolls back scripts', async () => {
        const {
            db,
            getDb,
            initialUpdatedAt,
            syncDb,
        } = await setup();
        const handlers = createScriptsHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
        });

        await expect(handlers.createWithId({
            id: 'script-2',
            title: 'Second',
        })).rejects.toThrow(outboxFailure);

        expect(await handlers.getSummary('script-2')).toBeNull();
        expect(await db.select().from(dbSchema.syncOutbox)).toEqual([]);
        await expectScriptTimestamp(db, initialUpdatedAt);
        expect(syncDb).not.toHaveBeenCalled();
    });

    it('rolls back places and cues', async () => {
        const {
            db,
            getDb,
            initialUpdatedAt,
            syncDb,
        } = await setup();
        const places = createLocationHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
        });
        const cues = createCueHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
        });

        await expect(places.createWithId('script-1', {
            id: 'place-1',
            name: 'Stage',
        })).rejects.toThrow(outboxFailure);
        await expect(cues.createWithId('script-1', {
            id: 'cue-1',
            title: 'Overture',
            kind: 'song',
        })).rejects.toThrow(outboxFailure);

        expect(await db.select().from(dbSchema.scriptLocations)).toEqual([]);
        expect(await db.select().from(dbSchema.scriptCues)).toEqual([]);
        await expectScriptTimestamp(db, initialUpdatedAt);
        expect(syncDb).not.toHaveBeenCalled();
    });

    it('rolls back character metadata', async () => {
        const {
            db,
            getDb,
            initialUpdatedAt,
            syncDb,
        } = await setup();
        const handlers = createCharacterHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
        });

        await expect(handlers.confirmScriptCharacterWithId('script-1', {
            id: 'character-1',
            key: 'ALICE',
            colorHex: '#123456',
        })).rejects.toThrow(outboxFailure);

        expect(await db.select().from(dbSchema.scriptCharacters)).toEqual([]);
        await expectScriptTimestamp(db, initialUpdatedAt);
        expect(syncDb).not.toHaveBeenCalled();
    });

    it('rolls back settings and title page', async () => {
        const {
            db,
            getDb,
            initialUpdatedAt,
            syncDb,
        } = await setup();
        const settings = createSettingsHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
        });
        const titlePage = createTitlePageHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
        });

        await expect(settings.saveScriptSettings('script-1', {
            page: {widthPx: 720},
        })).rejects.toThrow(outboxFailure);
        await expect(titlePage.save('script-1', {
            contact: 'Stage door',
        })).rejects.toThrow(outboxFailure);

        expect(await db.select().from(dbSchema.scriptSettingsPageLayout)).toEqual([]);
        expect(await db.select().from(dbSchema.scriptSettingsTitlePage)).toEqual([]);
        await expectScriptTimestamp(db, initialUpdatedAt);
        expect(syncDb).not.toHaveBeenCalled();
    });

    it('rolls back attachment metadata and binding', async () => {
        const {
            db,
            getDb,
            initialUpdatedAt,
            syncDb,
        } = await setup();

        await db.insert(dbSchema.scriptCues).values({
            id: 'cue-1',
            scriptId: 'script-1',
            sceneNumber: 0,
            indexInScene: 0,
            mode: 'open',
            title: 'Cue',
            kind: 'song',
            startBlockId: null,
            endBlockId: null,
            createdAt: 1,
            updatedAt: 1,
        });

        const handlers = createAttachmentHandlers({
            getDb,
            recordOutbox: failingOutbox,
            syncDb,
            fileStorage: new InMemoryFileStorage(),
        });

        await expect(handlers.setForCue('script-1', 'cue-1', 'integrated_score', {
            name: 'score.pdf',
            type: 'application/pdf',
            size: 3,
            blob: new Blob(['pdf']),
        })).rejects.toThrow(outboxFailure);

        expect(await db.select().from(dbSchema.scriptAttachments)).toEqual([]);
        expect(await db.select().from(dbSchema.scriptCueAttachments)).toEqual([]);
        await expectScriptTimestamp(db, initialUpdatedAt);
        expect(syncDb).not.toHaveBeenCalled();
    });
});
