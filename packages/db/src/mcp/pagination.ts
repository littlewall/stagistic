import {
    jsonByteLength,
    LocalMcpReadError,
    type ReadOperation,
    type ReadPage,
} from '@stagistic/mcp-contract';

import {fingerprint, type McpItem} from './types';

const encode = (value: unknown) => btoa(Array.from(new TextEncoder().encode(JSON.stringify(value)), byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_')
    .replaceAll('=', '');

const decodeOffset = (cursor: string, binding: string, revision: string): number => {
    try {
        const decoded: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(cursor.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))));

        if (!decoded || typeof decoded !== 'object' || !('binding' in decoded) || !('revision' in decoded) || !('offset' in decoded) || !('version' in decoded)) {
            throw new Error('Invalid cursor');
        }

        if (decoded.binding !== binding || decoded.version !== 1 || !Number.isSafeInteger(decoded.offset) || Number(decoded.offset) < 0) {
            throw new Error('Invalid cursor');
        }

        if (decoded.revision !== revision) {
            throw new LocalMcpReadError('STALE_CURSOR');
        }

        return Number(decoded.offset);
    } catch (error) {
        if (error instanceof LocalMcpReadError) {
            throw error;
        }

        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }
};

export const paginateReadItems = async (operation: ReadOperation, revision: string, items: McpItem[], format: string): Promise<ReadPage> => {
    const {
        cursor,
        limit = 20,
        ...filters
    } = operation.arguments;
    const binding = await fingerprint({tool: operation.tool, filters});
    const offset = cursor ? decodeOffset(cursor, binding, revision) : 0;

    if (offset > items.length) {
        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }

    const scope = 'script_id' in filters ? {kind: 'script', script_id: filters.script_id} : {kind: 'library'};
    const page: ReadPage = {
        format,
        scope,
        revision,
        items: [],
        next_cursor: null,
        incomplete: false,
    };
    const updateCursor = () => {
        const next = offset + page.items.length;

        page.next_cursor = next < items.length ? encode({
            version: 1,
            binding,
            revision,
            offset: next,
        }) : null;
        page.incomplete = page.next_cursor !== null;
    };

    while (offset + page.items.length < items.length && page.items.length < (limit ?? 20)) {
        const item = items[offset + page.items.length];

        page.items.push(item);
        updateCursor();

        if (jsonByteLength({ok: true, page}) > 32 * 1024) {
            page.items.pop();
            updateCursor();

            if (page.items.length === 0) {
                const ids = item.block_ids;

                throw new LocalMcpReadError('CONTENT_TOO_LARGE', 'A complete item exceeds the response limit.', Array.isArray(ids) ? String(ids[0]) : undefined);
            }

            break;
        }
    }

    return page;
};
