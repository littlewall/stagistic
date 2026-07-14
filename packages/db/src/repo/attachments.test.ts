import {
    describe, expect, it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../fileStorage';
import {dbSchema} from '../schema';
import {createTestDb, seedScript} from '../testing/createTestDb';
import {CUE_ATTACHMENT_ROLES} from '../types';
import {createAttachmentHandlers} from './attachments';

const upload = (name: string) => ({
    name,
    type: 'application/pdf',
    size: 3,
    blob: new Blob(['pdf'], {type: 'application/pdf'}),
});

const setup = async () => {
    const {db} = await createTestDb();
    const scriptId = 'script-1';
    const cueId = 'cue-1';

    await seedScript(db, scriptId);
    await db.insert(dbSchema.scriptCues).values({
        id: cueId,
        scriptId,
        sceneNumber: 0,
        indexInScene: 0,
        mode: 'open',
        title: 'Cue 1',
        kind: 'song',
        startBlockId: null,
        endBlockId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    const fileStorage = new InMemoryFileStorage();
    const handlers = createAttachmentHandlers({
        getDb: () => Promise.resolve(db),
        recordOutbox: () => Promise.resolve(),
        syncDb: () => Promise.resolve(),
        fileStorage,
    });

    return {
        db, scriptId, cueId, handlers,
    };
};

describe('createAttachmentHandlers', () => {
    it('sets and gets a cue attachment by role', async () => {
        const {
            scriptId, cueId, handlers,
        } = await setup();

        const created = await handlers.setForCue(
            scriptId,
            cueId,
            CUE_ATTACHMENT_ROLES.integratedScore,
            upload('score.pdf'),
        );
        const stored = await handlers.getByCueRole(cueId, CUE_ATTACHMENT_ROLES.integratedScore);

        expect(created?.filename).toBe('score.pdf');
        expect(created?.role).toBe(CUE_ATTACHMENT_ROLES.integratedScore);
        expect(stored?.id).toBe(created?.id);
        expect(await handlers.getBlob(created!.storageKey)).not.toBeNull();
    });

    it('replaces the existing attachment in the same cue role', async () => {
        const {
            db, scriptId, cueId, handlers,
        } = await setup();
        const first = await handlers.setForCue(
            scriptId,
            cueId,
            CUE_ATTACHMENT_ROLES.integratedScore,
            upload('first.pdf'),
        );
        const second = await handlers.setForCue(
            scriptId,
            cueId,
            CUE_ATTACHMENT_ROLES.integratedScore,
            upload('second.pdf'),
        );
        const stored = await handlers.getByCueRole(cueId, CUE_ATTACHMENT_ROLES.integratedScore);
        const links = await db.select().from(dbSchema.scriptCueAttachments);

        expect(stored?.id).toBe(second?.id);
        expect(links).toHaveLength(1);
        expect(await handlers.getBlob(first!.storageKey)).toBeNull();
        expect(await handlers.getBlob(second!.storageKey)).not.toBeNull();
    });

    it('removes the link and GCs the orphaned attachment + blob', async () => {
        const {
            scriptId, cueId, handlers,
        } = await setup();
        const created = await handlers.setForCue(
            scriptId,
            cueId,
            CUE_ATTACHMENT_ROLES.integratedScore,
            upload('a.pdf'),
        );

        await handlers.removeFromCue(scriptId, cueId, CUE_ATTACHMENT_ROLES.integratedScore);

        expect(await handlers.getByCueRole(cueId, CUE_ATTACHMENT_ROLES.integratedScore)).toBeNull();
        expect(await handlers.getBlob(created!.storageKey)).toBeNull();
    });
});
