import {
    getScriptBlockId,
    isScriptBlockNode,
    type ScriptNode,
} from '@stagistic/script';
import {createNodeId} from '@stagistic/shared';

import type {StepkgSnapshot} from './contracts';

const remapNullable = (id: string | null, map: ReadonlyMap<string, string>) => (id === null ? null : map.get(id) ?? id);

const remapNode = (node: ScriptNode, map: ReadonlyMap<string, string>): ScriptNode => {
    const blockId = isScriptBlockNode(node) ? getScriptBlockId(node) : null;
    const next: ScriptNode = {...node};

    if (blockId && map.has(blockId)) {
        next.attrs = {...node.attrs, id: map.get(blockId)};
    }

    if (node.content) {
        next.content = node.content.map(child => remapNode(child, map));
    }

    return next;
};

/**
 * Give every script block a fresh id and rewrite the rows that point at
 * blocks. Block ids are global row keys, so a copy living next to its source
 * in the same database needs its own. remapStepkgIds intentionally keeps
 * block ids; combine both for an independent copy.
 */
export const remapStepkgBlockIds = (snapshot: StepkgSnapshot, newId: () => string = createNodeId): StepkgSnapshot => {
    const map = new Map<string, string>();

    snapshot.document.content.forEach(node => {
        const blockId = getScriptBlockId(node);

        if (blockId && !map.has(blockId)) {
            map.set(blockId, newId());
        }
    });

    const importMeta = snapshot.document.attrs?.importMeta;

    return {
        ...snapshot,
        document: {
            ...snapshot.document,
            attrs: importMeta?.sceneSynopses
                ? {
                    ...snapshot.document.attrs,
                    importMeta: {
                        ...importMeta,
                        sceneSynopses: importMeta.sceneSynopses.map(synopsis => ({
                            ...synopsis,
                            headingBlockId: map.get(synopsis.headingBlockId) ?? synopsis.headingBlockId,
                        })),
                    },
                }
                : snapshot.document.attrs,
            content: snapshot.document.content.map(node => remapNode(node, map)),
        },
        music: {
            items: snapshot.music.items.map(item => ({
                ...item,
                startBlockId: remapNullable(item.startBlockId, map),
                endBlockId: remapNullable(item.endBlockId, map),
            })),
        },
        scenes: {
            ...snapshot.scenes,
            scenes: snapshot.scenes.scenes.map(scene => ({...scene, headingBlockId: remapNullable(scene.headingBlockId, map)})),
        },
        sceneCharacters: {items: snapshot.sceneCharacters.items.map(row => ({...row, headingBlockId: map.get(row.headingBlockId) ?? row.headingBlockId}))},
        comments: {
            ...snapshot.comments,
            threads: snapshot.comments.threads.map(thread => ({...thread, anchorBlockId: remapNullable(thread.anchorBlockId, map)})),
        },
    };
};
