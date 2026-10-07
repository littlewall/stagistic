/*
 * Node entry (comparison run): Hocuspocus' own node:http + crossws server.
 * Bundled with `bun build --target=node` and run with `node --expose-gc`.
 */
import {Server} from '@hocuspocus/server';

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

hocuspocus.configuration.extensions.push({
    onConnect: () => {
        metrics.connectionsOpen++;

        return Promise.resolve();
    },
    onDisconnect: () => {
        metrics.connectionsOpen--;

        return Promise.resolve();
    },
    async onRequest({request, response}) {
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
            return;
        }

        /* Hocuspocus contract: rejecting with an empty value stops the default handler. */
        // oxlint-disable-next-line typescript/only-throw-error
        throw null;
    },
});

const server = new Server({
    port: PORT,
    quiet: true,
    websocketOptions: {perMessageDeflate: PER_MESSAGE_DEFLATE, maxPayload: 16 * 1024 * 1024},
});

// Use the shared instance (persistence + the hooks above) for all connections.
server.hocuspocus = hocuspocus;
hocuspocus.server = server;

await server.listen();
console.log(`[sync-spike] node listening on :${PORT} (persistence=${STRATEGY}, perMessageDeflate=${PER_MESSAGE_DEFLATE})`);
