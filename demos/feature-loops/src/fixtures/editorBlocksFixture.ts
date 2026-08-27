import type {ScriptDocument} from '@stagistic/script';

type EditorBlocksDemoRepository = {
    createScript: (title: string, document: ScriptDocument) => Promise<string>,
    confirmScriptCharacterWithId: (
        scriptId: string,
        character: {id: string, key: string},
    ) => Promise<unknown>,
    createScriptMusicWithId: (
        scriptId: string,
        music: {id: string, title: string, kind: 'song' | 'instrumental'},
    ) => Promise<unknown>,
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<void>,
};

const EDITOR_BLOCKS_DEMO_SEED = {
    characters: [
        {id: 'demo-character-mara', key: 'MARA'},
        {id: 'demo-character-eli', key: 'ELI'},
    ],
    music: {
        id: 'demo-music-dawn',
        title: 'Dawn',
        kind: 'instrumental',
    },
} as const;

export const createEditorBlocksDemoDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'act',
            attrs: {id: 'demo-act'},
            content: [{type: 'text', text: 'ACT I'}],
        },
        {
            type: 'scene',
            attrs: {id: 'demo-scene'},
            content: [],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'demo-stage-direction-1'},
            content: [],
        },
        {
            type: 'character',
            attrs: {id: 'demo-character-block-1'},
            content: [],
        },
        {
            type: 'dialogue',
            attrs: {id: 'demo-dialogue'},
            content: [],
        },
        {
            type: 'character',
            attrs: {id: 'demo-character-block-2'},
            content: [],
        },
        {
            type: 'aside',
            attrs: {id: 'demo-aside'},
            content: [],
        },
        {
            type: 'lyrics',
            attrs: {id: 'demo-lyrics'},
            content: [],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'demo-stage-direction-2'},
            content: [],
        },
    ],
});

export const getEditorBlocksDemoSeed = () => ({
    characters: EDITOR_BLOCKS_DEMO_SEED.characters.map(character => ({...character})),
    music: {...EDITOR_BLOCKS_DEMO_SEED.music},
});

export const seedEditorBlocksDemoScript = async (
    repository: EditorBlocksDemoRepository,
): Promise<string> => {
    const scriptId = await repository.createScript(
        'Block vocabulary demo',
        createEditorBlocksDemoDocument(),
    );
    const seed = getEditorBlocksDemoSeed();

    for (const character of seed.characters) {
        await repository.confirmScriptCharacterWithId(scriptId, character);
    }

    await repository.createScriptMusicWithId(scriptId, seed.music);
    await repository.setActiveBlock(scriptId, 'demo-scene');

    return scriptId;
};
