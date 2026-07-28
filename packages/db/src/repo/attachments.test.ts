import {
    describe, expect, it, vi,
} from 'vite-plus/test';

import {
    type FileStorage,
    InMemoryFileStorage,
} from '../fileStorage';
import {dbSchema} from '../schema';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {MUSIC_ATTACHMENT_ROLES} from '../types';
import {createAttachmentHandlers} from './attachments';

const upload = (name: string) => ({
    name,
    type: 'application/pdf',
    size: 3,
    blob: new Blob(['pdf'], {type: 'application/pdf'}),
});

class TrackingFileStorage implements FileStorage {
    readonly blobs = new Map<string, Blob>();

    readonly deletedKeys: string[] = [];

    failDelete = false;

    save(blob: Blob) {
        const key = `blob-${this.blobs.size + 1}`;

        this.blobs.set(key, blob);

        return Promise.resolve(key);
    }

    get(key: string) {
        return Promise.resolve(this.blobs.get(key) ?? null);
    }

    delete(key: string) {
        this.deletedKeys.push(key);

        if (this.failDelete) {
            return Promise.reject(new Error('delete failed'));
        }

        this.blobs.delete(key);

        return Promise.resolve();
    }
}

const setup = async (fileStorage: FileStorage = new InMemoryFileStorage()) => {
    const {db} = await createTestDb();
    const scriptId = 'script-1';
    const musicId = 'music-1';

    await seedScript(db, scriptId);
    await db.insert(dbSchema.scriptMusic).values({
        id: musicId,
        scriptId,
        sceneNumber: 0,
        indexInScene: 0,
        mode: 'open',
        title: 'Music 1',
        kind: 'song',
        startBlockId: null,
        endBlockId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    const handlers = createAttachmentHandlers({
        getDb: () => Promise.resolve(db),
        recordOutbox: () => Promise.resolve(),
        syncDb: () => Promise.resolve(),
        fileStorage,
    });

    return {
        db, scriptId, musicId, handlers, fileStorage,
    };
};

describe('createAttachmentHandlers', () => {
    it('sets and gets a music attachment by role', async () => {
        const {
            scriptId, musicId, handlers,
        } = await setup();

        const created = await handlers.setForMusic(
            scriptId,
            musicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('score.pdf'),
        );
        const stored = await handlers.getByMusicRole(musicId, MUSIC_ATTACHMENT_ROLES.integratedScore);

        expect(created?.filename).toBe('score.pdf');
        expect(created?.role).toBe(MUSIC_ATTACHMENT_ROLES.integratedScore);
        expect(stored?.id).toBe(created?.id);
        expect(await handlers.getBlob(created!.storageKey)).not.toBeNull();
    });

    it('replaces the existing attachment in the same music role', async () => {
        const {
            db, scriptId, musicId, handlers,
        } = await setup();
        const first = await handlers.setForMusic(
            scriptId,
            musicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('first.pdf'),
        );
        const second = await handlers.setForMusic(
            scriptId,
            musicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('second.pdf'),
        );
        const stored = await handlers.getByMusicRole(musicId, MUSIC_ATTACHMENT_ROLES.integratedScore);
        const links = await db.select().from(dbSchema.scriptMusicAttachments);

        expect(stored?.id).toBe(second?.id);
        expect(links).toHaveLength(1);
        expect(await handlers.getBlob(first!.storageKey)).toBeNull();
        expect(await handlers.getBlob(second!.storageKey)).not.toBeNull();
    });

    it('removes the link and GCs the orphaned attachment + blob', async () => {
        const {
            scriptId, musicId, handlers,
        } = await setup();
        const created = await handlers.setForMusic(
            scriptId,
            musicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('a.pdf'),
        );

        await handlers.removeFromMusic(scriptId, musicId, MUSIC_ATTACHMENT_ROLES.integratedScore);

        expect(await handlers.getByMusicRole(musicId, MUSIC_ATTACHMENT_ROLES.integratedScore)).toBeNull();
        expect(await handlers.getBlob(created!.storageKey)).toBeNull();
    });

    it('deletes a newly stored blob when SQL persistence fails', async () => {
        const fileStorage = new TrackingFileStorage();
        const {scriptId, handlers} = await setup(fileStorage);

        await expect(handlers.setForMusic(
            scriptId,
            'missing-music',
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('orphan.pdf'),
        )).rejects.toThrow();

        expect(fileStorage.deletedKeys).toEqual(['blob-1']);
        expect(fileStorage.blobs.size).toBe(0);
    });

    it('keeps SQL removal committed when orphan blob deletion fails', async () => {
        const fileStorage = new TrackingFileStorage();
        const {
            scriptId,
            musicId,
            handlers,
        } = await setup(fileStorage);
        const created = await handlers.setForMusic(
            scriptId,
            musicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('score.pdf'),
        );
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        fileStorage.failDelete = true;
        await handlers.removeFromMusic(scriptId, musicId, MUSIC_ATTACHMENT_ROLES.integratedScore);

        expect(await handlers.getByMusicRole(musicId, MUSIC_ATTACHMENT_ROLES.integratedScore)).toBeNull();
        expect(await handlers.getBlob(created!.storageKey)).not.toBeNull();
        expect(consoleError).toHaveBeenCalledWith(
            '[attachments] Failed to clean up a removed blob.',
        );

        consoleError.mockRestore();
    });

    it('keeps metadata readable when its blob is missing', async () => {
        const fileStorage = new TrackingFileStorage();
        const {
            scriptId,
            musicId,
            handlers,
        } = await setup(fileStorage);
        const created = await handlers.setForMusic(
            scriptId,
            musicId,
            MUSIC_ATTACHMENT_ROLES.integratedScore,
            upload('missing.pdf'),
        );

        await fileStorage.delete(created!.storageKey);

        expect(await handlers.getByMusicRole(musicId, MUSIC_ATTACHMENT_ROLES.integratedScore))
            .toMatchObject({filename: 'missing.pdf'});
        expect(await handlers.getBlob(created!.storageKey)).toBeNull();
    });
});
