/*
 * Control protocol between tabs (clients) and the leader's engine, over one
 * BroadcastChannel. Document content never travels here: it uses the
 * per-document channels from `tabs/broadcastSync`.
 */

export const ENGINE_CHANNEL_NAME = 'stagistic-sync-engine';

export const bodyDocName = (scriptId: string) => `script/${scriptId}/body`;
export const metaDocName = (scriptId: string) => `script/${scriptId}/meta`;

export type EngineRequest =
    | {
        type: 'open',
        requestId: string,
        scriptId: string,
    }
    /** Waits until the engine has `stateVector`, then writes the projection. */
    | {
        type: 'flush',
        requestId: string,
        scriptId: string,
        stateVector: Uint8Array,
    }
    /** The projection was rewritten outside the engine (package restore). */
    | {
        type: 'body-replaced',
        requestId: string,
        scriptId: string,
    }
    | {
        type: 'script-deleted',
        requestId: string,
        scriptId: string,
    };

export interface OpenResult {
    schemaVersion: number | null,
}

export type EngineMessage =
    | EngineRequest
    | {
        type: 'reply',
        requestId: string,
        ok: true,
        result?: OpenResult,
    }
    | {
        type: 'reply',
        requestId: string,
        ok: false,
        error: string,
    }
    /** A (new) leader started: clients re-open their scripts. */
    | {type: 'engine-started', engineId: string};

export interface ControlChannel {
    postMessage(message: EngineMessage): void,
    addEventListener(type: 'message', listener: (event: {data: unknown}) => void): void,
    removeEventListener(type: 'message', listener: (event: {data: unknown}) => void): void,
    close(): void,
}

export type ControlChannelFactory = () => ControlChannel;

export const createControlChannel: ControlChannelFactory = () => new BroadcastChannel(ENGINE_CHANNEL_NAME);

export const isEngineMessage = (value: unknown): value is EngineMessage => {
    return typeof value === 'object' && value !== null && typeof (value as {type?: unknown}).type === 'string';
};
