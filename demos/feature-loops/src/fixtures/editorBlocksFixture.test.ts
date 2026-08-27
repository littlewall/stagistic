import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFixture = () => import('./editorBlocksFixture');

describe('createEditorBlocksDemoDocument', () => {
    it('starts with a static act and an empty scene ready for writing', async () => {
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
    });
});

describe('getEditorBlocksDemoSeed', () => {
    it('provides the confirmed cast and unassigned music used by the keyboard flow', async () => {
        const {getEditorBlocksDemoSeed} = await loadFixture();

        expect(getEditorBlocksDemoSeed()).toEqual({
            characters: [
                {id: 'demo-character-mara', key: 'MARA'},
                {id: 'demo-character-eli', key: 'ELI'},
            ],
            music: {
                id: 'demo-music-dawn',
                title: 'Dawn',
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
            createScript: async (title, document) => {
                events.push(['createScript', title, document]);

                return 'demo-script';
            },
            confirmScriptCharacterWithId: async (targetScriptId, character) => {
                events.push(['confirmCharacter', targetScriptId, character]);

                return null;
            },
            createScriptMusicWithId: async (targetScriptId, music) => {
                events.push(['createMusic', targetScriptId, music]);

                return null;
            },
            setActiveBlock: async (targetScriptId, blockId) => {
                events.push(['setActiveBlock', targetScriptId, blockId]);
            },
        });

        expect(scriptId).toBe('demo-script');
        expect(events).toEqual([
            ['createScript', 'Block vocabulary demo', {
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
            }],
            ['confirmCharacter', 'demo-script', {id: 'demo-character-mara', key: 'MARA'}],
            ['confirmCharacter', 'demo-script', {id: 'demo-character-eli', key: 'ELI'}],
            ['createMusic', 'demo-script', {
                id: 'demo-music-dawn',
                title: 'Dawn',
                kind: 'instrumental',
            }],
            ['setActiveBlock', 'demo-script', 'demo-scene'],
        ]);
    });
});
