import type {ScriptDocument} from '@stagistic/script';

type ActsAndScenesDemoRepository = {
    createScript: (title: string, document: ScriptDocument) => Promise<string>,
    setActiveBlock: (scriptId: string, blockId: string | null) => Promise<void>,
};

export const createActsAndScenesDemoDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'act',
            attrs: {id: 'acts-demo-act-1'},
            content: [{type: 'text', text: 'ACT I'}],
        },
        {
            type: 'scene',
            attrs: {id: 'acts-demo-scene-1'},
            content: [{type: 'text', text: 'THE STATION'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'acts-demo-station-direction-1'},
            content: [{type: 'text', text: 'Rain needles the platform windows.'}],
        },
        {
            type: 'character',
            attrs: {id: 'acts-demo-station-character-1'},
            content: [{type: 'text', text: 'MARA'}],
        },
        {
            type: 'dialogue',
            attrs: {id: 'acts-demo-station-dialogue-1'},
            content: [{type: 'text', text: 'We could still catch a cab.'}],
        },
        {
            type: 'character',
            attrs: {id: 'acts-demo-station-character-2'},
            content: [{type: 'text', text: 'JON'}],
        },
        {
            type: 'dialogue',
            attrs: {id: 'acts-demo-station-dialogue-2'},
            content: [{type: 'text', text: 'No. We wait for the signal.'}],
        },
    ],
});

export const seedActsAndScenesDemoScript = async (
    repository: ActsAndScenesDemoRepository,
): Promise<string> => {
    const scriptId = await repository.createScript(
        'Acts and scenes demo',
        createActsAndScenesDemoDocument(),
    );

    await repository.setActiveBlock(scriptId, 'acts-demo-scene-1');

    return scriptId;
};
