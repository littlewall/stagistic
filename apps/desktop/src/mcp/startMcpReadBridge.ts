import type {McpReadService} from '@stagistic/db';
import {
    LocalMcpReadError,
    type UiReply,
    type UiRequest,
    validateUiRequest,
} from '@stagistic/mcp-contract';

interface BridgeTransport {
    listen(handler: (request: unknown) => void): Promise<() => void>,
    attach(): Promise<string>,
    detach(generation: string): Promise<void>,
    reply(reply: UiReply): Promise<void>,
}

export const startMcpReadBridge = async ({
    service,
    transport,
    signal,
}: {
    service: McpReadService,
    transport: BridgeTransport,
    signal: AbortSignal,
}): Promise<() => Promise<void>> => {
    let attached: Promise<string> | undefined;
    let disposed = false;
    const handle = async (raw: unknown) => {
        let request: UiRequest;

        try {
            request = validateUiRequest(raw);
        } catch {
            return;
        }

        const generation = await attached;

        if (disposed || signal.aborted || request.generation !== generation) {
            return;
        }

        let reply: UiReply['reply'];

        try {
            reply = {ok: true, page: await service.execute(request.request.operation, signal)};
        } catch (error) {
            reply = {
                ok: false,
                error: error instanceof LocalMcpReadError
                    ? {
                        code: error.code,
                        message: error.message,
                        block_id: error.block_id,
                    }
                    : {code: 'INTERNAL_ERROR', message: 'The local script could not be read.'},
            };
        }

        if (!disposed && !signal.aborted) {
            await transport.reply({
                generation: request.generation,
                request_id: request.request_id,
                reply,
            });
        }
    };
    const unlisten = await transport.listen(raw => {
        void handle(raw).catch(() => undefined);
    });

    if (signal.aborted) {
        disposed = true;
        unlisten();

        return () => Promise.resolve();
    }

    let generation: string;

    try {
        attached = transport.attach();
        generation = await attached;
    } catch (error) {
        unlisten();
        throw error;
    }

    const dispose = async () => {
        if (disposed) {
            return;
        }

        disposed = true;
        unlisten();
        await transport.detach(generation);
    };

    if (signal.aborted) {
        await dispose();
    }

    return dispose;
};
