import type {Hocuspocus} from '@hocuspocus/server';
import {clientIpOf, createUpgradeLimiter} from '@stagistic/collab';
import type {Context, MiddlewareHandler} from 'hono';
import {upgradeWebSocket} from 'hono/deno';

/** Rejects clients opening too many sockets (per IP, see `createUpgradeLimiter`). */
export const collabSocketLimit = (): MiddlewareHandler => {
    const limiter = createUpgradeLimiter();

    return async (context, next) => {
        if (!limiter.allow(clientIpOf(context.req.raw.headers))) {
            return context.text('too many connections', 429);
        }

        await next();
    };
};

/** `GET /ws`: Deno WebSocket (via Hono) handed to Hocuspocus. */
export const collabSocketHandler = (hocuspocus: Hocuspocus) => upgradeWebSocket((context: Context) => {
    /*
     * Copy now: after the upgrade Deno consumes the request (headers unreadable,
     * signal aborted, which Hocuspocus treats as a closed request).
     */
    const request = new Request(context.req.url, {headers: new Headers(context.req.raw.headers)});
    let connection: ReturnType<Hocuspocus['handleConnection']> | undefined;

    return {
        onOpen: (_event, socket) => {
            try {
                connection = hocuspocus.handleConnection(socket.raw as WebSocket, request);
            } catch (error) {
                console.error('[server] collab connection failed', error);
                socket.close(1011, 'internal error');
            }
        },
        onMessage: event => {
            const data = event.data;

            connection?.handleMessage(typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data as ArrayBuffer));
        },
        onClose: event => {
            connection?.handleClose({code: event.code, reason: event.reason});
        },
    };
});
