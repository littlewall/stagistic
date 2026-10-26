import {collectScriptCharacterStats, resolveScriptBlockNodeType} from '@stagistic/script';

import {rebuildScriptDocumentFromBlocks} from '../blocks';
import type {McpSnapshot} from './readSnapshot';
import {resolveMcpScopes} from './semanticScopes';
import type {McpItem} from './types';

export const readMcpOutline = (snapshot: McpSnapshot): McpItem[] => {
    const {
        blocks,
        scenes,
        acts,
    } = snapshot;
    const scopes = resolveMcpScopes(snapshot);

    return blocks.flatMap(block => {
        const act = acts.find(row => row.headingBlockId === block.id);
        const scene = scenes.find(row => row.headingBlockId === block.id);

        if (!act && !scene) {
            return [];
        }

        const contained = blocks.filter(row => {
            const scope = scopes.get(row.id);

            return act ? scope?.actId === act.id : scope?.sceneId === scene?.id;
        });

        return [
            {
                kind: act ? 'act' : 'scene',
                id: act?.id ?? scene?.id,
                title: block.textContent,
                block_id: block.id,
                act_id: scopes.get(block.id)?.actId ?? null,
                scene_number: scene?.sceneNumber ?? null,
                synopsis: scene?.synopsis ?? null,
                block_count: contained.length,
                dialogue_count: contained.filter(row => resolveScriptBlockNodeType(row.blockType) === 'dialogue').length,
            },
        ];
    });
};

export const readMcpCharacters = (snapshot: McpSnapshot): McpItem[] => {
    const confirmed = snapshot.characters.map(row => ({
        kind: row.kind,
        character_id: row.id,
        character_key: row.characterKey,
        confirmed: true,
        notes: row.notes,
        backstory: row.backstory,
        outline: row.outline,
    }));
    const {document} = rebuildScriptDocumentFromBlocks(snapshot.script.id, snapshot.blocks, snapshot.refs.filter(ref => ref.isConfirmed));
    const stats = collectScriptCharacterStats(document, new Set(snapshot.characters.map(row => row.id)));
    const unknownKeys = new Set(stats.unconfirmedCountsByKey.keys());

    return [
        ...confirmed,
        ...Array.from(unknownKeys).toSorted()
            .map(key => ({
                kind: 'character',
                character_id: null,
                character_key: key,
                confirmed: false,
            })),
    ];
};
