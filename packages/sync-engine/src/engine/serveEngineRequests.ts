import {
    type ControlChannel,
    type EngineMessage,
    type EngineRequest,
    isEngineMessage,
    type OpenResult,
} from './protocol';

export interface EngineRequestHandlers {
    open(scriptId: string): Promise<OpenResult>,
    flush(scriptId: string, stateVector: Uint8Array): Promise<void>,
    bodyReplaced(scriptId: string): Promise<void>,
    scriptDeleted(scriptId: string): Promise<void>,
}

const HANDLED_TTL_MS = 60_000;

/**
 * Answers control requests on `channel`. Clients re-send while waiting for a
 * leader, so each request id is processed once and its reply re-sent.
 */
export const serveEngineRequests = (
    channel: ControlChannel,
    handlers: EngineRequestHandlers,
    log: (message: string, error?: unknown) => void,
) => {
    const handled = new Map<string, Promise<EngineMessage>>();
    let stopped = false;

    const process = async (request: EngineRequest): Promise<EngineMessage> => {
        try {
            switch (request.type) {
                case 'open':
                    return {
                        type: 'reply',
                        requestId: request.requestId,
                        ok: true,
                        result: await handlers.open(request.scriptId),
                    };
                case 'flush':
                    await handlers.flush(request.scriptId, request.stateVector);
                    break;
                case 'body-replaced':
                    await handlers.bodyReplaced(request.scriptId);
                    break;
                case 'script-deleted':
                    await handlers.scriptDeleted(request.scriptId);
                    break;
            }

            return {
                type: 'reply',
                requestId: request.requestId,
                ok: true,
            };
        } catch (error) {
            log(`${request.type} failed for ${request.scriptId}`, error);

            return {
                type: 'reply',
                requestId: request.requestId,
                ok: false,
                error: String(error),
            };
        }
    };

    const handleMessage = (event: {data: unknown}) => {
        const message = event.data;

        if (!isEngineMessage(message) || message.type === 'reply' || message.type === 'engine-started') {
            return;
        }

        let result = handled.get(message.requestId);

        if (!result) {
            result = process(message);
            handled.set(message.requestId, result);
            setTimeout(() => handled.delete(message.requestId), HANDLED_TTL_MS);
        }

        void result.then(reply => {
            if (!stopped) {
                channel.postMessage(reply);
            }
        });
    };

    channel.addEventListener('message', handleMessage);

    return {
        stop: () => {
            stopped = true;
            channel.removeEventListener('message', handleMessage);
        },
    };
};
