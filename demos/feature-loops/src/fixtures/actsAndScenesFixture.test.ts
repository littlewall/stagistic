import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFixture = () => import('./actsAndScenesFixture');

describe('createActsAndScenesDemoDocument', () => {
    it('starts with only the first scene through the final station dialogue', async () => {
        const {createActsAndScenesDemoDocument} = await loadFixture();

        const document = createActsAndScenesDemoDocument();

        expect(document.content?.map(node => node.type)).toEqual([
            'act',
            'scene',
            'stageDirection',
            'character',
            'dialogue',
            'character',
            'dialogue',
        ]);
        expect(document.content?.[0]).toMatchObject({
            attrs: {id: 'acts-demo-act-1'}, content: [{type: 'text', text: 'ACT I'}],
        });
        expect(document.content?.[1]).toMatchObject({
            attrs: {id: 'acts-demo-scene-1'}, content: [{type: 'text', text: 'THE STATION'}],
        });
        expect(document.content?.[6]).toMatchObject({
            attrs: {id: 'acts-demo-station-dialogue-2'},
            content: [{type: 'text', text: 'No. We wait for the signal.'}],
        });
    });
});

describe('seedActsAndScenesDemoScript', () => {
    it('creates the prepared document and focuses the first scene', async () => {
        const {seedActsAndScenesDemoScript} = await loadFixture();
        const events: unknown[] = [];

        const scriptId = await seedActsAndScenesDemoScript({
            createScript: (title, document) => {
                events.push([
                    'createScript',
                    title,
                    document,
                ]);

                return Promise.resolve('acts-demo-script');
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

        expect(scriptId).toBe('acts-demo-script');
        expect(events).toEqual([
            [
                'createScript',
                'Acts and scenes demo',
                expect.objectContaining({type: 'doc'}),
            ], [
                'setActiveBlock',
                'acts-demo-script',
                'acts-demo-scene-1',
            ],
        ]);
    });
});
