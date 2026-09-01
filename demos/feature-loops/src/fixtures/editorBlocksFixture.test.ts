import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFixture = () => import('./editorBlocksFixture');

describe('createEditorBlocksDemoDocument', () => {
    it('starts with a static act and empty blocks ready for character-by-character typing', async () => {
        const {createEditorBlocksDemoDocument} = await loadFixture();

        expect(createEditorBlocksDemoDocument()).toEqual({
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
                    type: 'stageDirection',
                    attrs: {id: 'demo-stage-direction-music'},
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
                    type: 'lyrics',
                    attrs: {id: 'demo-lyrics-2'},
                    content: [],
                },
                {
                    type: 'stageDirection',
                    attrs: {id: 'demo-stage-direction-2'},
                    content: [],
                },
            ],
        });
    });
});

describe('getEditorBlocksDemoSeed', () => {
    it('provides the confirmed cast and unassigned music used by the keyboard flow', async () => {
        const {getEditorBlocksDemoSeed} = await loadFixture();

        expect(getEditorBlocksDemoSeed()).toEqual({
            characters: [{id: 'demo-character-mara', key: 'MARA'}, {id: 'demo-character-eli', key: 'ELI'}],
            music: {
                id: 'demo-music-dawn',
                title: 'Dawn in Gold',
                kind: 'instrumental',
            },
        });
    });
});

describe('seedEditorBlocksDemoScript', () => {
    it('creates a scene-focused script with the cast and music needed by the flow', async () => {
        const {seedEditorBlocksDemoScript} = await loadFixture();
        const events: unknown[] = [];

        const scriptId = await seedEditorBlocksDemoScript({
            createScript: (title, document) => {
                events.push([
                    'createScript',
                    title,
                    document,
                ]);

                return Promise.resolve('demo-script');
            },
            confirmScriptCharacterWithId: (targetScriptId, character) => {
                events.push([
                    'confirmCharacter',
                    targetScriptId,
                    character,
                ]);

                return Promise.resolve(null);
            },
            createScriptMusicWithId: (targetScriptId, music) => {
                events.push([
                    'createMusic',
                    targetScriptId,
                    music,
                ]);

                return Promise.resolve(null);
            },
            setActiveBlock: (targetScriptId, blockId) => {
                events.push([
                    'setActiveBlock',
                    targetScriptId,
                    blockId,
                ]);

                return Promise.resolve();
            },
        });

        expect(scriptId).toBe('demo-script');
        expect(events).toEqual([
            [
                'createScript',
                'Block vocabulary demo',
                {
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
                            type: 'stageDirection',
                            attrs: {id: 'demo-stage-direction-music'},
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
                            type: 'lyrics',
                            attrs: {id: 'demo-lyrics-2'},
                            content: [],
                        },
                        {
                            type: 'stageDirection',
                            attrs: {id: 'demo-stage-direction-2'},
                            content: [],
                        },
                    ],
                },
            ],
            [
                'confirmCharacter',
                'demo-script',
                {id: 'demo-character-mara', key: 'MARA'},
            ],
            [
                'confirmCharacter',
                'demo-script',
                {id: 'demo-character-eli', key: 'ELI'},
            ],
            [
                'createMusic',
                'demo-script',
                {
                    id: 'demo-music-dawn',
                    title: 'Dawn in Gold',
                    kind: 'instrumental',
                },
            ],
            [
                'setActiveBlock',
                'demo-script',
                'demo-scene',
            ],
        ]);
    });
});
