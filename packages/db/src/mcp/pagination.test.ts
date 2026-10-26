import {
    jsonByteLength,
    type ReadOperation,
    validateLocalRequest,
} from '@stagistic/mcp-contract';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {paginateReadItems} from './pagination';

describe('MCP result budgets and cursors', () => {
    it('visits all items once and binds continuation to the operation', async () => {
        const items = Array.from({length: 45}, (_, id) => ({id}));
        let operation: ReadOperation = {tool: 'list_scripts', arguments: {}};
        const visited: unknown[] = [];
        const sizes: number[] = [];

        for (;;) {
            const page = await paginateReadItems(operation, 'revision', items, 'metadata');

            visited.push(...page.items);
            sizes.push(page.items.length);

            if (!page.next_cursor) {
                break;
            }

            await expect(paginateReadItems({tool: 'get_characters', arguments: {script_id: 'other', cursor: page.next_cursor}}, 'revision', items, 'metadata')).rejects.toMatchObject({code: 'INVALID_ARGUMENT'});
            operation = {tool: 'list_scripts', arguments: {cursor: page.next_cursor}};
        }

        expect(sizes).toEqual([
            20,
            20,
            5,
        ]);
        expect(visited).toEqual(items);
    });

    it('keeps cursors short even for long Unicode IDs', async () => {
        const script_id = '🎭'.repeat(1000);
        const operation = {tool: 'get_script_excerpt' as const, arguments: {script_id, limit: 1}};
        const page = await paginateReadItems(operation, 'revision', [{text: 'A'}, {text: 'B'}], 'stagistic');

        expect(page.next_cursor?.length).toBeLessThan(512);

        const continued = {...operation, arguments: {...operation.arguments, cursor: page.next_cursor}};

        expect(validateLocalRequest({protocol_version: 1, operation: continued})).toBeDefined();
    });

    it('counts the envelope in UTF-8 bytes and refuses oversized indivisible speeches', async () => {
        const operation = {tool: 'get_script_excerpt' as const, arguments: {script_id: 's'}};
        const items = Array.from({length: 20}, () => ({text: '🎭'.repeat(1000)}));
        const page = await paginateReadItems(operation, 'revision', items, 'stagistic');

        expect(page.items.length).toBeGreaterThan(0);
        expect(page.incomplete).toBe(true);
        expect(jsonByteLength({ok: true, page})).toBeLessThanOrEqual(32768);
        await expect(paginateReadItems(operation, 'revision', [{text: '🎭'.repeat(10000), block_ids: ['large-speech']}], 'stagistic')).rejects.toMatchObject({code: 'CONTENT_TOO_LARGE', block_id: 'large-speech'});
    });
});
