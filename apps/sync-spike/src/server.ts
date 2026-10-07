/* Bun entry: Bun.serve websocket handlers feed Hocuspocus.handleConnection. */
import type {ServerWebSocket} from 'bun';

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

type SocketData = {request: Request, connection?: ReturnType<typeof hocuspocus.handleConnection>};

Bun.serve<SocketData, never>({
    port: PORT,
    async fetch(request, server) {
        const url = new URL(request.url);

        if (url.pathname === '/metrics') {
            return Response.json(await snapshot());
        }

        if (url.pathname === '/metrics/reset') {
            resetMetrics();

            return Response.json({ok: true});
        }

        if (url.pathname === '/gc') {
            collectGarbage();

            return Response.json({ok: true});
        }

        if (server.upgrade(request, {data: {request}})) {
            return undefined;
        }

        return new Response('sync-spike', {status: 200});
    },
    websocket: {
        perMessageDeflate: PER_MESSAGE_DEFLATE,
        maxPayloadLength: 16 * 1024 * 1024,
        open(ws: ServerWebSocket<SocketData>) {
            metrics.connectionsOpen++;
            ws.data.connection = hocuspocus.handleConnection(ws, ws.data.request);
        },
        message(ws: ServerWebSocket<SocketData>, message) {
            ws.data.connection?.handleMessage(typeof message === 'string' ? new TextEncoder().encode(message) : new Uint8Array(message));
        },
        close(ws: ServerWebSocket<SocketData>, code, reason) {
            metrics.connectionsOpen--;
            ws.data.connection?.handleClose({code, reason});
        },
    },
});

console.log(`[sync-spike] listening on :${PORT} (persistence=${STRATEGY}, perMessageDeflate=${PER_MESSAGE_DEFLATE})`);
