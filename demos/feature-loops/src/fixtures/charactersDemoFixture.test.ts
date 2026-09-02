import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFixture = () => import('./charactersDemoFixture');

describe('characters demo fixture', () => {
    it('seeds the blocks for an unconfirmed Warden, a confirmed pair, and a group', async () => {
        const {
            createCharactersDemoDocument,
            seedCharactersDemoScript,
        } = await loadFixture();
        const events: unknown[] = [];

        expect(createCharactersDemoDocument()).toEqual({
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

        const scriptId = await seedCharactersDemoScript({
            createScript: (title, document) => {
                events.push([
                    'createScript',
                    title,
                    document,
                ]);

                return Promise.resolve('characters-demo-script');
            },
            confirmScriptCharacterWithId: (targetScriptId, character) => {
                events.push([
                    'confirmCharacter',
                    targetScriptId,
                    character,
                ]);

                return Promise.resolve(null);
            },
            createScriptCharacterGroupWithId: (targetScriptId, group) => {
                events.push([
                    'createGroup',
                    targetScriptId,
                    group,
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

        expect(scriptId).toBe('characters-demo-script');
        expect(events).toEqual([
            [
                'createScript',
                'Characters demo',
                createCharactersDemoDocument(),
            ],
            [
                'confirmCharacter',
                'characters-demo-script',
                {id: 'demo-characters-mara', key: 'MARA'},
            ],
            [
                'confirmCharacter',
                'characters-demo-script',
                {id: 'demo-characters-eli', key: 'ELI'},
            ],
            [
                'createGroup',
                'characters-demo-script',
                {id: 'demo-character-group-watch', key: 'THE WATCH'},
            ],
            [
                'setActiveBlock',
                'characters-demo-script',
                'demo-characters-unconfirmed',
            ],
        ]);
    });
});
