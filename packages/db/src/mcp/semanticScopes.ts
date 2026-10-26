import {resolveScriptBlockNodeType} from '@stagistic/script';

import type {McpSnapshot} from './readSnapshot';

export const resolveMcpScopes = (snapshot: McpSnapshot) => {
    const scopes = new Map<string, {actId: string | null, sceneId: string | null}>();
    let actId: string | null = null;
    let sceneId: string | null = null;

    for (const block of snapshot.blocks) {
        const type = resolveScriptBlockNodeType(block.blockType);

        if (type === 'act') {
            actId = snapshot.acts.find(act => act.headingBlockId === block.id)?.id ?? null;
            sceneId = null;
        }

        if (type === 'scene') {
            sceneId = snapshot.scenes.find(scene => scene.headingBlockId === block.id)?.id ?? null;
        }

        scopes.set(block.id, {actId, sceneId});
    }

    return scopes;
};
