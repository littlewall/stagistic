/*
 * Toxiproxy setup: `ws` proxies client → server, `pg` proxies server → DB.
 * Latency toxics are applied downstream (response direction) and split
 * across both directions for the client link, so the values are round trips.
 */
const TOXIPROXY_URL = process.env.TOXIPROXY_URL ?? 'http://localhost:8474';

const request = async (path: string, method: string, body?: unknown) => {
    const response = await fetch(`${TOXIPROXY_URL}${path}`, {
        method,
        headers: {'content-type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok && response.status !== 404 && response.status !== 409) {
        throw new Error(`toxiproxy ${method} ${path}: ${response.status} ${await response.text()}`);
    }
};

const setLatency = async (proxy: string, stream: 'upstream' | 'downstream', latency: number) => {
    const name = `${proxy}-${stream}-latency`;

    await request(`/proxies/${proxy}/toxics/${name}`, 'DELETE');

    if (latency > 0) {
        await request(`/proxies/${proxy}/toxics`, 'POST', {
            name,
            type: 'latency',
            stream,
            attributes: {latency, jitter: 0},
        });
    }
};

export const configureToxics = async ({dbLatencyMs, clientLatencyMs}: {dbLatencyMs: number, clientLatencyMs: number}) => {
    await setLatency('pg', 'downstream', dbLatencyMs);
    await setLatency('ws', 'upstream', Math.floor(clientLatencyMs / 2));
    await setLatency('ws', 'downstream', Math.ceil(clientLatencyMs / 2));
};
