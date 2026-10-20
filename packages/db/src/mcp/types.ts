import type {ReadOperation, ReadPage} from '@stagistic/mcp-contract';

export type McpItem = Record<string, unknown>;
export interface McpReadService {
    execute(operation: ReadOperation, signal?: AbortSignal): Promise<ReadPage>,
}

export const stableJson = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
        return Object.fromEntries(Object.entries(item).toSorted(([a], [b]) => a.localeCompare(b)));
    }

    return item;
});

export const fingerprint = async (value: unknown): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson(value)));

    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};
