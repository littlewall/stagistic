/*
 * Deno entry with permessage-deflate: Deno.upgradeWebSocket does not negotiate
 * it, so WebSockets go through node:http + `ws` (Deno Node compat). HTTP routes
 * would be Hono via @hono/node-server; the spike only needs the metrics routes.
 */
import {createServer} from 'node:http';

import {WebSocketServer} from 'ws';

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

const server = createServer(async (request, response) => {
    const respond = (body: unknown) => {
        response.writeHead(200, {'content-type': 'application/json'});
        response.end(JSON.stringify(body));
    };

    if (request.url === '/metrics') {
        respond(await snapshot());
    } else if (request.url === '/metrics/reset') {
        resetMetrics();
        respond({ok: true});
    } else if (request.url === '/gc') {
        collectGarbage();
        respond({ok: true});
    } else {
        response.end('sync-spike');
    }
});
const wss = new WebSocketServer({
    server,
    perMessageDeflate: PER_MESSAGE_DEFLATE,
    maxPayload: 16 * 1024 * 1024,
});

wss.on('connection', (ws, incoming) => {
    const headers = new Headers();

    for (const [key, value] of Object.entries(incoming.headers)) {
        if (typeof value === 'string') {
            headers.set(key, value);
        }
    }

    metrics.connectionsOpen++;

    const connection = hocuspocus.handleConnection(ws, new Request(`http://localhost${incoming.url ?? '/'}`, {headers}));

    ws.on('message', data => connection.handleMessage(new Uint8Array(data as Buffer)));
    ws.on('close', (code, reason) => {
        metrics.connectionsOpen--;
        connection.handleClose({code, reason: reason.toString()});
    });
});

server.listen(PORT, () => console.log(`[sync-spike] deno+ws listening on :${PORT} (persistence=${STRATEGY}, perMessageDeflate=${PER_MESSAGE_DEFLATE})`));
