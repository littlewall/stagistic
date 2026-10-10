import {
    createLocalPgliteRepository,
    InMemoryFileStorage,
    type ScriptPackageWrite,
} from '@stagistic/db';
import {createTestDb} from '@stagistic/db/testing';
import {
    collectCommentAnchorThreadIds,
    COMMENT_ANCHOR_MARK_NAME,
    type ScriptDocument,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    createScriptSnapshotFromCurrent,
    loadScriptSnapshot,
    restoreScriptSnapshot,
    restoreScriptSnapshotAsNew,
} from './scriptSnapshotOperations';

const SCRIPT_ID = 'script-1';

const text = (value: string, threadId?: string) => ({
    type: 'text',
    text: value,
    ...threadId ? {marks: [{type: COMMENT_ANCHOR_MARK_NAME, attrs: {threadId}}]} : {},
});

const document = (lines: Array<{
    id: string,
    type: string,
    content: ReturnType<typeof text>[],
}>): ScriptDocument => ({
    type: 'doc',
    content: lines.map(line => ({
        type: line.type,
        attrs: {id: line.id},
        content: line.content,
    })),
});

const draftOneDocument = document([
    {
        id: 'scene-1',
        type: 'scene',
        content: [text('Scene One')],
    },
    {
        id: 'b1',
        type: 'stageDirection',
        content: [text('The room is '), text('dark', 'range-kept')],
    },
    {
        id: 'b2',
        type: 'stageDirection',
        content: [text('A door ', 'range-deleted'), text('opens.')],
    },
]);

const thread = (id: string, anchorKind: 'block' | 'range', anchorBlockId: string | null) => ({
    id,
    anchorKind,
    anchorBlockId,
    quotedText: '',
    status: 'open',
    resolvedAt: null,
    resolvedBy: null,
    createdBy: 'local',
    createdAt: 1_000,
    updatedAt: 1_000,
});

const message = (threadId: string) => ({
    id: `${threadId}-message`,
    threadId,
    authorId: 'local',
    body: threadId,
    createdAt: 1_000,
    updatedAt: 1_000,
    editedAt: null,
});

const packageWrite = (overrides: Partial<ScriptPackageWrite> = {}): ScriptPackageWrite => ({
    script: {
        id: SCRIPT_ID,
        title: 'The door',
        subtitle: null,
        createdAt: 1_000,
        updatedAt: 1_000,
    },
    document: draftOneDocument,
    titlePage: {source: 'Draft one title page'},
    settings: {},
    characters: [],
    groups: [],
    genders: [],
    music: [
        {
            id: 'm1',
            sceneNumber: 1,
            indexInScene: 0,
            mode: 'open',
            title: 'Song',
            kind: null,
            startBlockId: null,
            endBlockId: null,
            createdAt: 1_000,
            updatedAt: 1_000,
        },
    ],
    locations: [],
    scenes: [],
    attachments: [
        {
            id: 'a1',
            filename: 'score.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            blob: new Blob(['pdf']),
            createdAt: 1_000,
            updatedAt: 1_000,
        },
    ],
    bindings: [
        {
            musicId: 'm1',
            attachmentId: 'a1',
            role: 'integrated_score',
            sortOrder: 0,
            createdAt: 1_000,
        },
    ],
    comments: {
        threads: [thread('range-kept', 'range', null), thread('range-deleted', 'range', null)],
        messages: [message('range-kept'), message('range-deleted')],
    },
    ...overrides,
});

const blockTexts = (doc: ScriptDocument | undefined) => doc?.content.map(node => ({
    id: node.attrs?.id,
    text: node.content?.map(part => part.text ?? '').join(''),
})) ?? [];

const setup = async () => {
    const {db} = await createTestDb();
    const fileStorage = new InMemoryFileStorage();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage,
    });

    await repository.createScriptFromPackage(packageWrite());

    return {repository, fileStorage};
};

/*
 * Draft 1 is the package above. The current state then rewrites the text,
 * drops the music attachment, deletes the range-deleted thread, keeps
 * range-kept, adds a block comment on a new block and changes the title page.
 */
const editAfterDraftOne = async (repository: Awaited<ReturnType<typeof setup>>['repository']) => {
    await repository.restoreScriptFromPackage(packageWrite({
        script: {
            id: SCRIPT_ID,
            title: 'The last door',
            subtitle: null,
            createdAt: 1_000,
            updatedAt: 2_000,
        },
        document: document([
            {
                id: 'scene-1',
                type: 'scene',
                content: [text('Scene One')],
            },
            {
                id: 'b1',
                type: 'stageDirection',
                content: [text('The room is '), text('dark', 'range-kept')],
            },
            {
                id: 'b3',
                type: 'stageDirection',
                content: [text('Silence.')],
            },
        ]),
        titlePage: {source: 'Current title page'},
        music: [],
        attachments: [],
        bindings: [],
        comments: {
            threads: [
                thread('range-kept', 'range', null),
                thread('block-new', 'block', 'b3'),
                thread('block-b1', 'block', 'b1'),
            ],
            messages: [
                message('range-kept'),
                message('block-new'),
                message('block-b1'),
            ],
        },
    }));
};

describe('script snapshot operations', () => {
    it('stores the current state and loads it back', async () => {
        const {repository} = await setup();
        const flushed: string[] = [];
        const snapshot = await createScriptSnapshotFromCurrent({
            repository,
            scriptId: SCRIPT_ID,
            kind: 'draft',
            note: 'first pass',
            flush: () => {
                flushed.push('flush');

                return Promise.resolve();
            },
        });
        const loaded = await loadScriptSnapshot({
            repository,
            scriptId: SCRIPT_ID,
            snapshotId: snapshot!.id,
        });

        expect(flushed).toEqual(['flush']);
        expect(snapshot).toMatchObject({
            kind: 'draft',
            number: 1,
            note: 'first pass',
        });
        expect(loaded.ok && loaded.snapshot.document).toEqual((await repository.getScriptPackageSource(SCRIPT_ID))?.document);
        expect(loaded.ok && loaded.snapshot.attachments.map(attachment => attachment.filename)).toEqual(['score.pdf']);
    });

    it('restores content, keeps the surroundings and saves the current state first', async () => {
        const {repository, fileStorage} = await setup();
        const draftOne = await createScriptSnapshotFromCurrent({
            repository,
            scriptId: SCRIPT_ID,
            kind: 'draft',
        });
        const draftOneSource = await repository.getScriptPackageSource(SCRIPT_ID);
        const attachmentKey = draftOneSource!.attachments[0].storageKey;

        await editAfterDraftOne(repository);

        const result = await restoreScriptSnapshot({
            repository,
            scriptId: SCRIPT_ID,
            snapshot: draftOne!,
        });
        const restored = await repository.getScriptPackageSource(SCRIPT_ID);

        expect(result).toMatchObject({
            ok: true,
            backup: {
                kind: 'draft',
                number: 2,
                note: 'Before restoring Draft 1',
            },
        });
        expect(blockTexts(restored?.document)).toEqual(blockTexts(draftOneSource?.document));
        expect(restored?.script.title).toBe('The last door');
        expect(restored?.titlePage.source).toBe('Current title page');
        expect(restored?.music.map(music => music.id)).toEqual(['m1']);
        expect(restored?.attachments.map(attachment => attachment.storageKey)).toEqual([attachmentKey]);
        expect(await fileStorage.get(attachmentKey)).not.toBeNull();
    });

    it('keeps only comments whose anchor survives and never resurrects deleted threads', async () => {
        const {repository} = await setup();
        const draftOne = await createScriptSnapshotFromCurrent({
            repository,
            scriptId: SCRIPT_ID,
            kind: 'draft',
        });

        await editAfterDraftOne(repository);
        await restoreScriptSnapshot({
            repository,
            scriptId: SCRIPT_ID,
            snapshot: draftOne!,
        });

        const restored = await repository.getScriptPackageSource(SCRIPT_ID);
        const backup = (await repository.listScriptSnapshots(SCRIPT_ID))[0];
        const backupPayload = await loadScriptSnapshot({
            repository,
            scriptId: SCRIPT_ID,
            snapshotId: backup.id,
        });

        expect(restored?.comments.threads.map(item => item.id).sort()).toEqual(['block-b1', 'range-kept']);
        expect(restored?.comments.messages.map(item => item.threadId).sort()).toEqual(['block-b1', 'range-kept']);
        expect([...collectCommentAnchorThreadIds(restored!.document)]).toEqual(['range-kept']);
        expect(backupPayload.ok && backupPayload.snapshot.comments.threads.map(item => item.id).sort()).toEqual([
            'block-b1',
            'block-new',
            'range-kept',
        ]);
    });

    it('creates an independent script next to the source', async () => {
        const {repository} = await setup();
        const version = await createScriptSnapshotFromCurrent({
            repository,
            scriptId: SCRIPT_ID,
            kind: 'version',
            name: 'Festival',
        });
        const sourceBefore = await repository.getScriptPackageSource(SCRIPT_ID);
        const result = await restoreScriptSnapshotAsNew({
            repository,
            scriptId: SCRIPT_ID,
            snapshotId: version!.id,
            title: 'The door — Festival',
        });

        expect(result.ok).toBe(true);

        const copy = result.ok ? await repository.getScriptPackageSource(result.scriptId) : null;
        const sourceAfter = await repository.getScriptPackageSource(SCRIPT_ID);
        const blockIds = (doc: ScriptDocument | undefined) => doc?.content.map(node => node.attrs?.id) ?? [];

        expect(copy?.script.title).toBe('The door — Festival');
        expect(blockTexts(copy?.document).map(block => block.text)).toEqual(blockTexts(sourceBefore?.document).map(block => block.text));
        expect(blockIds(copy?.document).some(id => blockIds(sourceBefore?.document).includes(id))).toBe(false);
        expect(copy?.attachments.map(attachment => attachment.storageKey)).toEqual(sourceBefore?.attachments.map(attachment => attachment.storageKey));
        expect(sourceAfter?.document).toEqual(sourceBefore?.document);
    });

    it('does not create a backup when the snapshot cannot be read', async () => {
        const {repository, fileStorage} = await setup();
        const draft = await createScriptSnapshotFromCurrent({
            repository,
            scriptId: SCRIPT_ID,
            kind: 'draft',
        });

        await fileStorage.delete(draft!.payloadStorageKey);

        const result = await restoreScriptSnapshot({
            repository,
            scriptId: SCRIPT_ID,
            snapshot: draft!,
        });

        expect(result.ok).toBe(false);
        expect(await repository.listScriptSnapshots(SCRIPT_ID)).toHaveLength(1);
    });
});
