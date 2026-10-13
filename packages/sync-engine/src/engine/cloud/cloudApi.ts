import {computeClockOffset} from '../../conflicts/classify';
import type {AccessTokenSource} from './accessToken';
import type {CloudScript} from './types';

/** REST client of the collab service (`/scripts` on `sync.api`). */
export interface CloudApi {
    /** All scripts of the account (deleted included) and the server clock offset. */
    list(): Promise<{scripts: CloudScript[], clockOffsetMs: number}>,
    /** Registers a local script, or restores one deleted in the cloud. */
    register(scriptId: string, title: string): Promise<CloudScript>,
    remove(scriptId: string): Promise<void>,
}

export class CloudUnauthorizedError extends Error {}

export const createCloudApi = ({
    syncUrl,
    tokens,
    fetch: fetchImpl = fetch,
}: {
    syncUrl: string,
    tokens: AccessTokenSource,
    fetch?: typeof fetch,
}): CloudApi => {
    const request = async (path: string, init: RequestInit = {}, retried = false): Promise<Response> => {
        const token = await tokens.get({force: retried});

        if (!token) {
            throw new CloudUnauthorizedError('signed out');
        }

        const headers = new Headers(init.headers);

        headers.set('authorization', `Bearer ${token}`);

        if (init.body) {
            headers.set('content-type', 'application/json');
        }

        const response = await fetchImpl(`${syncUrl}${path}`, {...init, headers});

        if (response.status === 401 && !retried) {
            return request(path, init, true);
        }

        if (response.status === 401) {
            throw new CloudUnauthorizedError('access token rejected');
        }

        if (!response.ok) {
            throw new Error(`[sync-engine] ${init.method ?? 'GET'} ${path} failed (${response.status})`);
        }

        return response;
    };

    return {
        list: async () => {
            const response = await request('/scripts');
            const receivedAt = Date.now();
            const body = await response.json() as {scripts: CloudScript[]};

            return {scripts: body.scripts, clockOffsetMs: computeClockOffset(response.headers.get('date'), receivedAt)};
        },
        register: async (scriptId, title) => await (await request('/scripts', {method: 'POST', body: JSON.stringify({id: scriptId, title})})).json() as CloudScript,
        remove: async scriptId => {
            await request(`/scripts/${encodeURIComponent(scriptId)}`, {method: 'DELETE'});
        },
    };
};
