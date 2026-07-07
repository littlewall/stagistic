import type {
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';

export const text = (value: string): ScriptNode => ({type: 'text', text: value});

export const block = (
    type: string,
    id: string,
    value: string,
): ScriptNode => ({
    type,
    attrs: {id, blockType: type},
    content: value ? [text(value)] : [],
});

export const sampleDoc = (): ScriptDocument => ({
    type: 'doc',
    content: [
        block('act', 'actA', 'Act One'),
        block('scene', 'sceneA', 'Scene A'),
        block('stageDirection', 'sdA', '@ALICE waits.'),
        block('scene', 'sceneB', 'Scene B'),
        block('stageDirection', 'sdB', '@BOB enters.'),
    ],
});
