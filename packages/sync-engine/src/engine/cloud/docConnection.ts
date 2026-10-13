import {HocuspocusProvider, HocuspocusProviderWebsocket} from '@hocuspocus/provider';
import type * as Y from 'yjs';

import type {AccessTokenSource} from './accessToken';

/*
 * One WebSocket to the collab service; a Hocuspocus provider per attached
 * Y.Doc (`script/{id}/{kind}`). The engine's own docs are attached, so cloud
 * updates land in IndexedDB, tabs and the projection like any other update.
 */

export interface DocConnection {
    /** Resolves once the server state is merged and local changes are acknowledged. */
    idle(timeoutMs?: number): Promise<void>,
    hasUnsyncedChanges(): boolean,
    destroy(): void,
}

export interface CloudSocket {
    /** `onStateless`: server hints on the channel doc (`user/{id}/events`). */
    attach(documentName: string, document: Y.Doc, options?: {onStateless?: (payload: string) => void}): DocConnection,
    close(): void,
}

export class CloudAccessDeniedError extends Error {}

export const createCloudSocket = ({
    wsUrl,
    tokens,
    WebSocketPolyfill,
    onStatus,
}: {
    wsUrl: string,
    tokens: AccessTokenSource,
    WebSocketPolyfill?: unknown,
    onStatus?: (status: 'connected' | 'disconnected') => void,
}): CloudSocket => {
    let socket: HocuspocusProviderWebsocket | null = null;

    const getSocket = () => {
        socket ??= new HocuspocusProviderWebsocket({
            url: wsUrl,
            ...WebSocketPolyfill ? {WebSocketPolyfill} : {},
            onConnect: () => onStatus?.('connected'),
            onDisconnect: () => onStatus?.('disconnected'),
        });

        return socket;
    };

    return {
        attach: (documentName, document, {onStateless} = {}) => {
            let denied: Error | null = null;
            let destroyed = false;
            const waiters = new Set<() => void>();
            const notify = () => waiters.forEach(waiter => waiter());
            const provider = new HocuspocusProvider({
                name: documentName,
                document,
                websocketProvider: getSocket(),
                // Called on every (re)authentication: always a fresh token.
                token: async () => await tokens.get() ?? '',
                onAuthenticationFailed: ({reason}) => {
                    denied = new CloudAccessDeniedError(`${documentName}: ${reason}`);
                    notify();
                },
                onSynced: notify,
                onUnsyncedChanges: notify,
                ...onStateless ? {onStateless: ({payload}: {payload: string}) => onStateless(payload)} : {},
            });

            provider.attach();

            const isIdle = () => provider.synced && !provider.hasUnsyncedChanges;

            return {
                hasUnsyncedChanges: () => provider.hasUnsyncedChanges,
                idle: (timeoutMs = 30_000) => new Promise<void>((resolve, reject) => {
                    const check = () => {
                        if (destroyed) {
                            done();
                            reject(new Error(`${documentName}: detached`));
                        } else if (denied) {
                            done();
                            reject(denied);
                        } else if (isIdle()) {
                            done();
                            resolve();
                        }
                    };
                    const timer = setTimeout(() => {
                        done();
                        reject(new Error(`${documentName}: sync timed out`));
                    }, timeoutMs);
                    const done = () => {
                        clearTimeout(timer);
                        waiters.delete(check);
                    };

                    waiters.add(check);
                    check();
                }),
                destroy: () => {
                    destroyed = true;
                    // Settle pending waits now instead of at their timeout.
                    notify();
                    provider.destroy();
                },
            };
        },
        close: () => {
            socket?.destroy();
            socket = null;
        },
    };
};
