import {type ChildProcessWithoutNullStreams, spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';

import {createLocalMcpReadService, rebuildScriptProjection} from '@stagistic/db';
import {createTestDb, seedScript} from '@stagistic/db/testing';
import {
    LocalMcpReadError,
    type ReadPage,
    validateUiRequest,
} from '@stagistic/mcp-contract';
import {parseStagistic} from '@stagistic/script';
import {expect, it} from 'vite-plus/test';

interface RpcResponse {
    result: {
        serverInfo: {name: string},
        tools: unknown[],
        isError: boolean,
        structuredContent?: unknown,
        content: {text: string}[],
    },
}

it('reads saved local Stagistic text through the real stdio executable and desktop broker', async () => {
    const {db, client} = await createTestDb();
    const children: ChildProcessWithoutNullStreams[] = [];

    try {
        await seedScript(db, 'local-e2e');
        await rebuildScriptProjection({
            db,
            scriptId: 'local-e2e',
            document: parseStagistic('# First scene\n\n@ANNA\nČervený zvonek.').document,
        });

        const service = createLocalMcpReadService({getDb: () => Promise.resolve(db)});
        const host = spawn(fileURLToPath(new URL('../../../../apps/desktop/src-tauri/target/debug/examples/local_mcp_host', import.meta.url)));

        children.push(host);
        await new Promise<void>((resolve, reject) => {
            host.once('error', reject);
            host.once('exit', code => {
                if (code) {
                    reject(new Error('Test broker failed to start; check the development endpoint.'));
                }
            });

            const lines = createInterface({input: host.stdout});

            lines.on('line', (line: string) => {
                const raw: unknown = JSON.parse(line);

                if (raw && typeof raw === 'object' && 'ready' in raw && raw.ready === true) {
                    resolve();

                    return;
                }

                const request = validateUiRequest(raw);

                void service.execute(request.request.operation).then(page => {
                    host.stdin.write(`${JSON.stringify({
                        generation: request.generation,
                        request_id: request.request_id,
                        reply: {ok: true, page},
                    })}\n`);
                }).catch((error: unknown) => {
                    host.stdin.write(`${JSON.stringify({
                        generation: request.generation,
                        request_id: request.request_id,
                        reply: {ok: false, error: {code: error instanceof LocalMcpReadError ? error.code : 'INTERNAL_ERROR', message: 'Read failed'}},
                    })}\n`);
                });
            });
        });

        const bridge = spawn(fileURLToPath(new URL('../../../mcp/target/debug/stagistic-mcp', import.meta.url)));

        children.push(bridge);

        const responses = createInterface({input: bridge.stdout})[Symbol.asyncIterator]();
        let id = 0;
        const call = async (method: string, params?: unknown) => {
            bridge.stdin.write(`${JSON.stringify({
                jsonrpc: '2.0',
                id: ++id,
                method,
                params,
            })}\n`);

            const response = await responses.next();

            if (response.done) {
                throw new Error('MCP bridge closed without a response.');
            }

            return JSON.parse(response.value) as RpcResponse;
        };
        const hello = await call('initialize', {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: {name: 'e2e', version: '1'},
        });

        expect(hello.result.serverInfo.name).toBe('stagistic');
        bridge.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
        expect((await call('tools/list')).result.tools).toHaveLength(9);
        expect((await call('prompts/list')).result.prompts).toHaveLength(6);

        const result = await call('tools/call', {name: 'get_script_excerpt', arguments: {script_id: 'local-e2e'}});

        expect(result.result.isError).toBe(false);
        expect(result.result.structuredContent).toBeUndefined();

        const page = JSON.parse(result.result.content[0].text) as ReadPage;

        expect(page.format).toBe('stagistic');
        expect(JSON.stringify(page.items)).toContain('Červený zvonek.');

        const search = await call('tools/call', {name: 'search_script', arguments: {script_id: 'local-e2e', query: 'červený zvonek'}});

        const matches = JSON.parse(search.result.content[0].text) as ReadPage;

        expect(matches.items).toHaveLength(1);
    } finally {
        for (const child of children.toReversed()) {
            child.stdin.end();
            await new Promise<void>(resolve => {
                if (child.exitCode !== null) {
                    resolve();

                    return;
                }

                const timer = setTimeout(() => {
                    child.kill();
                    resolve();
                }, 2000);

                child.once('exit', () => {
                    clearTimeout(timer);
                    resolve();
                });
            });
        }

        await client.close();
    }
});
