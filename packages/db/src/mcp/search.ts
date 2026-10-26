import {LocalMcpReadError, type ReadOperation} from '@stagistic/mcp-contract';
import {isScriptBlockType} from '@stagistic/script';
import {
    and,
    asc,
    desc,
    eq,
    inArray,
    sql,
} from 'drizzle-orm';

import type {DbClient} from '../queries';
import {scriptBlocks} from '../schema';
import type {McpSnapshot} from './readSnapshot';
import {resolveMcpScopes} from './semanticScopes';
import type {McpItem} from './types';

export const searchMcpBlocks = async (tx: DbClient, snapshot: McpSnapshot, operation: Extract<ReadOperation, {tool: 'search_script'}>): Promise<McpItem[]> => {
    const {arguments: args} = operation;

    if (args.scene_id && !snapshot.scenes.some(scene => scene.id === args.scene_id)) {
        throw new LocalMcpReadError('NOT_FOUND');
    }

    if (args.block_type && !isScriptBlockType(args.block_type)) {
        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }

    const scopes = resolveMcpScopes(snapshot);
    const sceneBlocks = Array.from(scopes).filter(([, scope]) => scope.sceneId === args.scene_id).map(([id]) => id);
    const vector = sql`to_tsvector('simple', ${scriptBlocks.textContent})`;
    const query = sql`plainto_tsquery('simple', ${args.query})`;
    const rank = sql<number>`ts_rank_cd(${vector}, ${query})`;
    const rows = await tx.select({block: scriptBlocks, rank}).from(scriptBlocks).where(and(
        eq(scriptBlocks.scriptId, args.script_id),
        sql`${vector} @@ ${query}`,
        args.scene_id ? inArray(scriptBlocks.id, sceneBlocks) : undefined,
        args.block_type ? eq(scriptBlocks.blockType, args.block_type) : undefined,
    ))
        .orderBy(desc(rank), asc(scriptBlocks.blockOrder), asc(scriptBlocks.id));

    return rows.map(({block, rank: relevance}) => {
        const characters = Array.from(block.textContent);
        const token = args.query.match(/[\p{L}\p{N}]+/u)?.[0]?.toLocaleLowerCase() ?? '';
        const location = block.textContent.toLocaleLowerCase().indexOf(token);
        const start = Math.max(0, Array.from(block.textContent.slice(0, Math.max(0, location))).length - 60);

        return {
            kind: 'match',
            block_id: block.id,
            scene_id: scopes.get(block.id)?.sceneId ?? null,
            act_id: scopes.get(block.id)?.actId ?? null,
            relevance,
            snippet: characters.slice(start, start + 240).join(''),
        };
    });
};
