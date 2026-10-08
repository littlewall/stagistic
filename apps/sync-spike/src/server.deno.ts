/* Deno entry: Hono routes + hono/deno upgradeWebSocket feeding Hocuspocus.handleConnection. */
import {Hono} from 'hono';
import {upgradeWebSocket} from 'hono/deno';

import {
    collectGarbage,
    hocuspocus,
    metrics,
    PER_MESSAGE_DEFLATE,
    PORT,
    resetMetrics,
    snapshot,
    STRATEGY,
} from './core';

declare const Deno: {serve(options: {port: number}, handler: (request: Request) => Response | Promise<Response>): unknown};

const app = new Hono();

app.get('/metrics', async context => context.json(await snapshot()));
app.get('/metrics/reset', context => {
    resetMetrics();

    return context.json({ok: true});
});
app.get('/gc', context => {
    collectGarbage();

    return context.json({ok: true});
});
app.get('/*', upgradeWebSocket(context => {
    let connection: ReturnType<typeof hocuspocus.handleConnection> | undefined;

    return {
        onOpen: (_event, ws) => {
            metrics.connectionsOpen++;
            connection = hocuspocus.handleConnection(ws.raw as WebSocket, context.req.raw);
        },
        onMessage: event => {
            const data = event.data;

            connection?.handleMessage(typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data as ArrayBuffer));
        },
        onClose: event => {
            metrics.connectionsOpen--;
            connection?.handleClose({code: event.code, reason: event.reason});
        },
    };
}));

Deno.serve({port: PORT}, app.fetch);
console.log(`[sync-spike] deno listening on :${PORT} (persistence=${STRATEGY}, perMessageDeflate=${PER_MESSAGE_DEFLATE})`);
