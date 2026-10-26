import {
    LocalMcpReadError,
    type ReadOperation,
    type ReadPage,
    validateLocalRequest,
} from '@stagistic/mcp-contract';
import {asc} from 'drizzle-orm';

import type {LocalDb} from '../pglite';
import {scripts} from '../schema';
import {paginateReadItems} from './pagination';
import {readMcpFragments} from './readFragments';
import {readStageLogistics} from './readLogistics';
import {readMcpCharacters, readMcpOutline} from './readMetadata';
import {readSceneTelemetry} from './readSceneTelemetry';
import {readMcpSnapshot} from './readSnapshot';
import {searchMcpBlocks} from './search';
import {fingerprint, type McpReadService} from './types';

export const createLocalMcpReadService = ({getDb}: {getDb: () => Promise<LocalDb>}): McpReadService => {
    let active = 0;
    const execute = async (input: ReadOperation, signal?: AbortSignal): Promise<ReadPage> => {
        const {operation} = validateLocalRequest({protocol_version: 1, operation: input});

        if (active >= 8) {
            throw new LocalMcpReadError('BUSY');
        }

        signal?.throwIfAborted();
        active += 1;
        try {
            const db = await getDb();

            return await db.transaction(async tx => {
                signal?.throwIfAborted();

                if (operation.tool === 'list_scripts') {
                    const rows = await tx.select({
                        id: scripts.id,
                        title: scripts.title,
                        subtitle: scripts.subtitle,
                        updated_at: scripts.updatedAt,
                        summary: scripts.summaryMetadata,
                    }).from(scripts).orderBy(asc(scripts.id));

                    return paginateReadItems(operation, await fingerprint(rows), rows, 'metadata');
                }

                const snapshot = await readMcpSnapshot(tx, operation.arguments.script_id);
                const revision = await fingerprint(snapshot);

                signal?.throwIfAborted();

                const metadata = {
                    get_script_outline: () => readMcpOutline(snapshot),
                    get_characters: () => readMcpCharacters(snapshot),
                    get_stage_logistics: () => readStageLogistics(snapshot),
                    get_scene_telemetry: () => readSceneTelemetry(snapshot, 'scene_id' in operation.arguments ? operation.arguments.scene_id ?? '' : ''),
                };
                const isMetadata = operation.tool === 'get_script_outline'
                    || operation.tool === 'get_characters'
                    || operation.tool === 'get_stage_logistics'
                    || operation.tool === 'get_scene_telemetry';
                const items = operation.tool === 'search_script'
                    ? await searchMcpBlocks(tx, snapshot, operation)
                    : isMetadata ? metadata[operation.tool]() : readMcpFragments(snapshot, operation);

                signal?.throwIfAborted();

                return paginateReadItems(operation, revision, items, operation.tool === 'search_script' ? 'plain_text' : isMetadata ? 'metadata' : 'stagistic');
            }, {isolationLevel: 'repeatable read', accessMode: 'read only'});
        } finally {
            active -= 1;
        }
    };

    return {execute};
};
