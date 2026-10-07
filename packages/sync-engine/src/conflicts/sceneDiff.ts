import {getScriptBlockId, type ScriptDocument} from '@stagistic/script';

const PREAMBLE_KEY = '__preamble__';

/**
 * Groups top-level blocks into scenes keyed by the scene heading `blockId`.
 * Blocks before the first scene heading (title, act heading) form a preamble.
 */
const groupScenes = (document: ScriptDocument) => {
    const scenes = new Map<string, string[]>();
    let currentKey = PREAMBLE_KEY;

    for (const node of document.content) {
        if (node.type === 'scene') {
            currentKey = getScriptBlockId(node) ?? `${PREAMBLE_KEY}${scenes.size}`;
        }

        const blocks = scenes.get(currentKey) ?? [];

        blocks.push(JSON.stringify(node));
        scenes.set(currentKey, blocks);
    }

    return new Map([...scenes].map(([key, blocks]) => [key, blocks.join('\n')]));
};

/**
 * Number of scenes that differ between two versions (changed, added or
 * removed), matched by scene heading `blockId`. Used by the conflict dialog.
 */
export const countDifferingScenes = (left: ScriptDocument, right: ScriptDocument) => {
    const leftScenes = groupScenes(left);
    const rightScenes = groupScenes(right);
    const keys = new Set([...leftScenes.keys(), ...rightScenes.keys()]);
    let count = 0;

    for (const key of keys) {
        if (leftScenes.get(key) !== rightScenes.get(key)) {
            count++;
        }
    }

    return count;
};
