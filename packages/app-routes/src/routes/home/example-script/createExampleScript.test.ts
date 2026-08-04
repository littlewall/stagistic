import type {ScriptRepository} from '@stagistic/app-core';
import {buildScriptBlockIndex, parseStagistic} from '@stagistic/script';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import source from './example-script.stagistic?raw';
import {createExampleScript} from './createExampleScript';
import {
    loadExampleScriptTemplate,
    type ExampleScriptTemplate,
} from './loadExampleScriptTemplate';
import {prepareExampleScriptDocument} from './prepareExampleScriptDocument';

const INTEGRATED_SCORE_ROLE = 'integrated_score' as const;

vi.mock('./loadExampleScriptTemplate', () => ({
    loadExampleScriptTemplate: vi.fn(),
}));

type ExampleRepository = Pick<
    ScriptRepository,
    | 'allocateScriptCharacterId'
    | 'confirmScriptCharacterWithId'
    | 'saveLatest'
    | 'saveTitlePage'
    | 'setMusicAttachment'
    | 'removeMusicAttachment'
>;

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

const createCharacter = (id: string, key: string) => ({
    id,
    kind: 'character' as const,
    key,
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
});

const createRepository = (): ExampleRepository => {
    let characterNumber = 0;

    return {
        allocateScriptCharacterId: () => `character-${++characterNumber}`,
        confirmScriptCharacterWithId: vi.fn(async (_scriptId, input) => {
            return createCharacter(input.id, input.key);
        }),
        saveLatest: vi.fn(async () => undefined),
        saveTitlePage: vi.fn(async () => undefined),
        setMusicAttachment: vi.fn(async () => null),
        removeMusicAttachment: vi.fn(async () => undefined),
    };
};

const createActions = () => ({
    createScript: vi.fn(async () => 'script-new'),
    deleteScript: vi.fn(async () => undefined),
});

afterEach(() => {
    vi.mocked(loadExampleScriptTemplate).mockReset();
});

describe('createExampleScript', () => {
    it('creates linked characters, persists the document, and attaches the score', async () => {
        const template = createTemplate();
        const repository = createRepository();
        const actions = createActions();

        vi.mocked(loadExampleScriptTemplate).mockResolvedValue(template);

        await expect(createExampleScript({actions, repository})).resolves.toEqual({
            scriptId: 'script-new',
            title: 'Example musical',
        });

        expect(actions.createScript).toHaveBeenCalledWith('Example musical', template.document);
        expect(repository.confirmScriptCharacterWithId).toHaveBeenCalledTimes(2);
        expect(repository.setMusicAttachment).toHaveBeenCalledWith(
            'script-new',
            template.scoreMusicId,
            INTEGRATED_SCORE_ROLE,
            template.score,
        );
        expect(actions.deleteScript).not.toHaveBeenCalled();

        const savedDocument = vi.mocked(repository.saveLatest).mock.calls[0]?.[1];
        const characterRefs = buildScriptBlockIndex(savedDocument).snapshot.blocks
            .flatMap(block => block.characterRefs ?? []);

        expect(characterRefs).toEqual(expect.arrayContaining([
            expect.objectContaining({characterId: 'character-1'}),
            expect.objectContaining({characterId: 'character-2'}),
        ]));
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

        expect(repository.removeMusicAttachment).toHaveBeenCalledWith(
            'script-new',
            template.scoreMusicId,
            INTEGRATED_SCORE_ROLE,
        );
        expect(actions.deleteScript).toHaveBeenCalledWith('script-new');
        expect(
            vi.mocked(repository.removeMusicAttachment).mock.invocationCallOrder[0],
        ).toBeLessThan(vi.mocked(actions.deleteScript).mock.invocationCallOrder[0] ?? Infinity);
    });
});
