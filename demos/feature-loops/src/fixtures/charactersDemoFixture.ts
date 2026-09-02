import type {ScriptDocument} from '@stagistic/script';

type CharactersDemoRepository = {
    createScript: (title: string, document: ScriptDocument) => Promise<string>,
    confirmScriptCharacterWithId: (
        scriptId: string,
        character: {id: string, key: string},
    ) => Promise<unknown>,
    createScriptCharacterGroupWithId: (
        scriptId: string,
        group: {id: string, key: string},
    ) => Promise<unknown>,
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<void>,
};

const CHARACTERS_DEMO_SEED = {
    characters: [{id: 'demo-characters-mara', key: 'MARA'}, {id: 'demo-characters-eli', key: 'ELI'}],
    group: {id: 'demo-character-group-watch', key: 'THE WATCH'},
} as const;

export const createCharactersDemoDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'act',
            attrs: {id: 'demo-characters-act'},
            content: [{type: 'text', text: 'ACT I'}],
        },
        {
            type: 'scene',
            attrs: {id: 'demo-characters-scene'},
            content: [{type: 'text', text: 'THE OBSERVATORY'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'demo-characters-opening'},
            content: [{type: 'text', text: 'Night presses against the glass.'}],
        },
        {
            type: 'character',
            attrs: {id: 'demo-characters-unconfirmed'},
            content: [],
        },
        {
            type: 'dialogue',
            attrs: {id: 'demo-characters-warden-dialogue'},
            content: [],
        },
        {
            type: 'character',
            attrs: {id: 'demo-characters-mara'},
            content: [],
        },
        {
            type: 'dialogue',
            attrs: {id: 'demo-characters-mara-dialogue'},
            content: [],
        },
        {
            type: 'character',
            attrs: {id: 'demo-characters-together'},
            content: [],
        },
        {
            type: 'dialogue',
            attrs: {id: 'demo-characters-together-dialogue'},
            content: [],
        },
        {
            type: 'character',
            attrs: {id: 'demo-characters-watch'},
            content: [],
        },
        {
            type: 'dialogue',
            attrs: {id: 'demo-characters-watch-dialogue'},
            content: [],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'demo-characters-tagged-direction'},
            content: [],
        },
    ],
});

export const seedCharactersDemoScript = async (
    repository: CharactersDemoRepository,
): Promise<string> => {
    const scriptId = await repository.createScript(
        'Characters demo',
        createCharactersDemoDocument(),
    );

    for (const character of CHARACTERS_DEMO_SEED.characters) {
        await repository.confirmScriptCharacterWithId(scriptId, character);
    }

    await repository.createScriptCharacterGroupWithId(scriptId, CHARACTERS_DEMO_SEED.group);
    await repository.setActiveBlock(scriptId, 'demo-characters-unconfirmed');

    return scriptId;
};
