import {buildScriptBlockIndex, collectCommentAnchorThreadIds, parseStagistic} from '@stagistic/script';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';

import {createExampleScript, type ExampleScriptRepository} from './createExampleScript';
import source from './example-script.stagistic?raw';
import {type ExampleScriptTemplate, loadExampleScriptTemplate} from './loadExampleScriptTemplate';
import {prepareExampleScriptDocument} from './prepareExampleScriptDocument';

const INTEGRATED_SCORE_ROLE = 'integrated_score';

vi.mock('./loadExampleScriptTemplate', () => ({
    loadExampleScriptTemplate: vi.fn(),
}));

const createTemplate = (): ExampleScriptTemplate => ({
    ...prepareExampleScriptDocument(parseStagistic(source).document),
    title: 'Example musical',
    titlePage: {},
    score: {
        name: 'example-score.pdf',
        type: 'application/pdf',
        size: 1,
        blob: new Blob(['pdf'], {type: 'application/pdf'}),
    },
});

const createEntity = (id: string, key: string, kind: 'character' | 'group' = 'character') => ({
    id,
    kind,
    key,
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
    voiceType: null,
    vocalRangeLow: null,
    vocalRangeHigh: null,
    memberIds: [],
});

const createRepository = () => {
    let idNumber = 0;
    const nextId = (prefix: string) => () => `${prefix}-${++idNumber}`;
    const resolved = <T>(value: T) => vi.fn((..._args: unknown[]) => Promise.resolve(value));

    return {
        allocateScriptCharacterId: nextId('character'),
        allocateScriptCharacterGroupId: nextId('group'),
        allocateScriptCommentThreadId: nextId('thread'),
        allocateScriptCommentMessageId: nextId('message'),
        allocateScriptLocationId: nextId('location'),
        confirmScriptCharacterWithId: vi.fn((_scriptId: string, input: {id: string; key: string}) => {
            return Promise.resolve(createEntity(input.id, input.key));
        }),
        createScriptCharacterGroupWithId: vi.fn((_scriptId: string, input: {id: string; key: string}) => {
            return Promise.resolve(createEntity(input.id, input.key, 'group'));
        }),
        replaceScriptCharacterGroupMembers: resolved(null),
        upsertScriptCharacterGender: vi.fn((_scriptId: string, label: string) => {
            return Promise.resolve({id: `gender-${label}`, key: label.toLowerCase(), label});
        }),
        setScriptCharacterGender: resolved(null),
        setScriptCharacterOutline: resolved(null),
        setScriptCharacterVoiceType: resolved(null),
        setScriptCharacterVocalRange: resolved(null),
        createScriptCommentThread: vi.fn((_scriptId: string, input: {id: string}) => Promise.resolve({id: input.id})),
        addScriptCommentMessage: resolved(null),
        setScriptCommentThreadStatus: resolved(null),
        createScriptLocationWithId: vi.fn((_scriptId: string, input: {id: string; name: string}) => {
            return Promise.resolve({id: input.id, name: input.name});
        }),
        replaceScriptSceneLocations: resolved([]),
        saveLatest: resolved(undefined),
        saveTitlePage: resolved(undefined),
        setMusicAttachment: resolved(null),
        removeMusicAttachment: resolved(undefined),
    } as unknown as ExampleScriptRepository;
};

const createActions = () => ({
    createScript: vi.fn(() => Promise.resolve('script-new')),
    deleteScript: vi.fn(() => Promise.resolve(undefined)),
});

afterEach(() => {
    vi.mocked(loadExampleScriptTemplate).mockReset();
});

describe('createExampleScript', () => {
    it('creates the full example cast, comments, and locations before attaching the score', async () => {
        const template = createTemplate();
        const repository = createRepository();
        const actions = createActions();

        vi.mocked(loadExampleScriptTemplate).mockResolvedValue(template);

        await expect(createExampleScript({actions, repository})).resolves.toEqual({
            scriptId: 'script-new',
            title: 'Example musical',
        });

        expect(actions.createScript).toHaveBeenCalledWith('Example musical', template.document);
        expect(repository.confirmScriptCharacterWithId).toHaveBeenCalledTimes(4);
        expect(repository.setScriptCharacterVocalRange).toHaveBeenCalledTimes(4);
        expect(repository.upsertScriptCharacterGender).toHaveBeenCalledTimes(2);
        expect(repository.createScriptCharacterGroupWithId).toHaveBeenCalledWith('script-new', expect.objectContaining({key: 'CREW'}));
        expect(repository.replaceScriptCharacterGroupMembers).toHaveBeenCalledWith('script-new', expect.any(String), [expect.any(String), expect.any(String)]);
        expect(repository.createScriptCommentThread).toHaveBeenCalledTimes(3);
        expect(repository.addScriptCommentMessage).toHaveBeenCalledTimes(1);
        expect(repository.setScriptCommentThreadStatus).toHaveBeenCalledWith('script-new', expect.any(String), 'resolved');
        expect(repository.replaceScriptSceneLocations).toHaveBeenCalledTimes(4);
        expect(repository.setMusicAttachment).toHaveBeenCalledWith('script-new', template.scoreMusicId, INTEGRATED_SCORE_ROLE, template.score);
        expect(actions.deleteScript).not.toHaveBeenCalled();

        const savedDocument = vi.mocked(repository.saveLatest).mock.calls[0]?.[1];
        const characterRefs = buildScriptBlockIndex(savedDocument).snapshot.blocks.flatMap(block => block.characterRefs ?? []);

        expect(characterRefs.every(ref => ref.characterId !== null)).toBe(true);
        expect(collectCommentAnchorThreadIds(savedDocument).size).toBe(2);
        expect(vi.mocked(repository.saveLatest).mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(repository.replaceScriptSceneLocations).mock.invocationCallOrder[0] ?? 0,
        );
    });

    it('deletes the incomplete script when document persistence fails', async () => {
        const repository = createRepository();
        const actions = createActions();
        const failure = new Error('document failed');

        vi.mocked(loadExampleScriptTemplate).mockResolvedValue(createTemplate());
        vi.mocked(repository.saveLatest).mockRejectedValue(failure);

        await expect(createExampleScript({actions, repository})).rejects.toBe(failure);

        expect(repository.removeMusicAttachment).not.toHaveBeenCalled();
        expect(actions.deleteScript).toHaveBeenCalledWith('script-new');
    });

    it('removes the attached score before deleting a script when title-page persistence fails', async () => {
        const template = createTemplate();
        const repository = createRepository();
        const actions = createActions();
        const failure = new Error('title page failed');

        vi.mocked(loadExampleScriptTemplate).mockResolvedValue(template);
        vi.mocked(repository.saveTitlePage).mockRejectedValue(failure);

        await expect(createExampleScript({actions, repository})).rejects.toBe(failure);

        expect(repository.removeMusicAttachment).toHaveBeenCalledWith('script-new', template.scoreMusicId, INTEGRATED_SCORE_ROLE);
        expect(actions.deleteScript).toHaveBeenCalledWith('script-new');
        expect(vi.mocked(repository.removeMusicAttachment).mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(actions.deleteScript).mock.invocationCallOrder[0] ?? Infinity,
        );
    });
});
