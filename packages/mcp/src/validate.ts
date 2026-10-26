import Ajv2020 from 'ajv/dist/2020';

import type {LocalRequest} from './generated/LocalRequest';
import localRequestSchema from './generated/LocalRequest.json';
import type {ErrorCode, ReadReply} from './generated/ReadReply';
import type {UiReply} from './generated/UiReply';
import uiReplySchema from './generated/UiReply.json';
import type {UiRequest} from './generated/UiRequest';
import uiRequestSchema from './generated/UiRequest.json';

export class LocalMcpReadError extends Error {
    constructor(public readonly code: ErrorCode, message = code as string, public readonly block_id?: string) {
        super(message);
        this.name = 'LocalMcpReadError';
    }
}

const ajv = new Ajv2020({
    strict: false,
    allErrors: false,
    formats: {
        uint: true,
        uint32: true,
        uint64: true,
    },
});
const checkRequest = ajv.compile<LocalRequest>(localRequestSchema);
const checkUiRequest = ajv.compile<UiRequest>(uiRequestSchema);
const checkReply = ajv.compile<UiReply>(uiReplySchema);
const encoder = new TextEncoder();

export const jsonByteLength = (value: unknown): number => encoder.encode(JSON.stringify(value)).length;

export const validateLocalRequest = (value: unknown): LocalRequest => {
    if (!checkRequest(value) || jsonByteLength(value) > 16 * 1024) {
        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }

    if (value.protocol_version !== 1) {
        throw new LocalMcpReadError('VERSION_MISMATCH');
    }

    const {tool, arguments: args} = value.operation;

    if ((args.limit ?? 20) > (tool === 'search_script' ? 50 : 100)) {
        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }

    for (const [key, field] of Object.entries(args)) {
        if (typeof field !== 'string') {
            continue;
        }

        const max = key === 'query' ? 512 : key === 'cursor' ? 8192 : 2048;

        if (!field.trim() || Array.from(field).length > max) {
            throw new LocalMcpReadError('INVALID_ARGUMENT');
        }
    }

    return value;
};

export const validateUiRequest = (value: unknown): UiRequest => {
    if (!checkUiRequest(value)) {
        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }

    validateLocalRequest(value.request);

    return value;
};

export const assertReadReplySize = (reply: ReadReply): void => {
    if (jsonByteLength(reply) > 32 * 1024) {
        throw new LocalMcpReadError('CONTENT_TOO_LARGE');
    }
};

export const validateUiReply = (value: unknown): UiReply => {
    if (!checkReply(value) || value.reply.ok !== ('page' in value.reply)) {
        throw new LocalMcpReadError('INVALID_ARGUMENT');
    }

    assertReadReplySize(value.reply);

    return value;
};
