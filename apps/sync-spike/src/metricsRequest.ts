import type {IncomingMessage, ServerResponse} from 'node:http';

import {
    collectGarbage,
    resetMetrics,
    snapshot,
} from './core';

/** Shared instrumentation keeps the Node and Deno transport comparison equivalent. */
export const handleMetricsRequest = async (request: IncomingMessage, response: ServerResponse) => {
    const respond = (body: unknown) => {
        response.writeHead(200, {'content-type': 'application/json'});
        response.end(JSON.stringify(body));

        return true;
    };

    if (request.url === '/metrics') {
        return respond(await snapshot());
    }

    if (request.url === '/metrics/reset') {
        resetMetrics();

        return respond({ok: true});
    }

    if (request.url === '/gc') {
        collectGarbage();

        return respond({ok: true});
    }

    return false;
};
