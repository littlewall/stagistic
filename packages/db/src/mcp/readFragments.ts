import {LocalMcpReadError, type ReadOperation} from '@stagistic/mcp-contract';
import {serializeStagisticUnits} from '@stagistic/script';

import {rebuildScriptDocumentFromBlocks} from '../blocks';
import type {McpSnapshot} from './readSnapshot';
import {resolveMcpScopes} from './semanticScopes';
import type {McpItem} from './types';

export const readMcpFragments = (snapshot: McpSnapshot, operation: ReadOperation): McpItem[] => {
    const {
        blocks,
        refs,
        script,
    } = snapshot;
    const args = operation.arguments;

    if ('scene_id' in args && args.scene_id && !snapshot.scenes.some(row => row.id === args.scene_id)) {
        throw new LocalMcpReadError('NOT_FOUND');
    }

    if ('character_id' in args && !snapshot.characters.some(row => row.id === args.character_id)) {
        throw new LocalMcpReadError('NOT_FOUND');
    }

    const {document, warnings} = rebuildScriptDocumentFromBlocks(script.id, blocks, refs.filter(ref => ref.isConfirmed));

    if (warnings.length > 0) {
        throw new LocalMcpReadError('INTERNAL_ERROR', 'Stored script content could not be read faithfully.');
    }

    let units = serializeStagisticUnits(document);

    if ('start_block_id' in args && args.start_block_id) {
        const start = units.findIndex(unit => unit.blockIds.includes(args.start_block_id ?? ''));

        if (start < 0) {
            throw new LocalMcpReadError('NOT_FOUND');
        }

        units = units.slice(start);
    }

    const byId = resolveMcpScopes(snapshot);

    return units.filter(unit => {
        const block = byId.get(unit.blockIds[0]);

        if ('scene_id' in args && args.scene_id && block?.sceneId !== args.scene_id) {
            return false;
        }

        if ('character_id' in args) {
            return unit.kind === 'speech' && refs.some(ref => ref.blockId === unit.blockIds[0] && ref.isConfirmed && ref.characterId === args.character_id);
        }

        return true;
    }).map(unit => ({
        kind: 'fragment',
        block_ids: unit.blockIds,
        text: unit.text,
        scene_id: byId.get(unit.blockIds[0])?.sceneId ?? null,
        act_id: byId.get(unit.blockIds[0])?.actId ?? null,
        context: unit.contextBefore,
    }));
};
