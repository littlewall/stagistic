import {
    createInMemoryReactiveQuerySource,
    type SceneCharacterInput,
    type ScriptRepository,
    type ScriptSceneCharacter,
    type ScriptSceneSynopsis,
} from '@stagistic/db';
import {
    vi,
} from 'vite-plus/test';

import {createSceneMetadataActions} from './sceneMetadataActions';
import {getSceneMetadataStore} from './sceneMetadataStore';

export const deferred = () => {
    let resolve: () => void = () => undefined;
    let reject: (error: Error) => void = () => undefined;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise,
        resolve,
        reject,
    };
};

export const characterKey = (headingBlockId: string, characterId: string) => JSON.stringify([headingBlockId, characterId]);

/*
 * A repository whose writes the test releases one by one, publishing durable rows to the
 * sources the way the real one publishes through its outbox sync.
 */
export const createHarness = ({headings = ['h1']}: {headings?: string[]} = {}) => {
    const charactersSource = createInMemoryReactiveQuerySource<ScriptSceneCharacter>([]);
    const synopsesSource = createInMemoryReactiveQuerySource<ScriptSceneSynopsis>([]);
    let clock = 1_000;
    let characterRows: ScriptSceneCharacter[] = [];
    let synopsisRows: ScriptSceneSynopsis[] = [];
    const writeGate = deferred();
    const publishCharacter = (row: ScriptSceneCharacter) => {
        characterRows = [
            ...characterRows.filter(item => !(item.headingBlockId === row.headingBlockId && item.characterId === row.characterId)),
            row,
        ];
        charactersSource.emit(characterRows);
    };
    const repository = {
        getScriptSceneCharactersSource: () => charactersSource,
        getScriptSceneSynopsesSource: () => synopsesSource,
        putSceneCharacter: vi.fn(async (
            _scriptId: string,
            headingBlockId: string,
            characterId: string,
            input: SceneCharacterInput,
        ): Promise<ScriptSceneCharacter | null> => {
            await writeGate.promise;

            const existing = characterRows.find(row => row.headingBlockId === headingBlockId && row.characterId === characterId);

            if (!headings.includes(headingBlockId) || characterId === 'missing') return null;

            const row: ScriptSceneCharacter = {
                scriptId: 's1',
                headingBlockId,
                characterId,
                note: existing && input.note === undefined ? existing.note : input.note?.trim() || null,
                arcValue: existing && input.arcValue === undefined ? existing.arcValue : input.arcValue ?? null,
                createdAt: existing?.createdAt ?? ++clock,
                updatedAt: ++clock,
            };

            publishCharacter(row);

            return row;
        }),
        removeSceneCharacter: vi.fn(async (_scriptId: string, headingBlockId: string, characterId: string) => {
            await writeGate.promise;

            characterRows = characterRows.filter(row => !(row.headingBlockId === headingBlockId && row.characterId === characterId));
            charactersSource.emit(characterRows);
        }),
        updateSceneSynopsis: vi.fn(async (_scriptId: string, headingBlockId: string, value: string | null): Promise<boolean> => {
            await writeGate.promise;

            if (!headings.includes(headingBlockId)) return false;

            const synopsis = value?.trim() || null;
            const next = [...synopsisRows.filter(row => row.headingBlockId !== headingBlockId), {headingBlockId, synopsis}];

            synopsisRows = next;
            synopsesSource.emit(next);

            return true;
        }),
    };
    const actions = createSceneMetadataActions(repository as unknown as ScriptRepository, 's1');

    return {
        actions,
        repository,
        writeGate,
        store: getSceneMetadataStore(repository as unknown as ScriptRepository, 's1'),
        charactersSource,
        synopsesSource,
        durableCharacters: () => characterRows,
    };
};

export const prepare = async (harness: ReturnType<typeof createHarness>) => {
    await harness.store.characters.collection.preload();
    await harness.store.synopses.collection.preload();
};

