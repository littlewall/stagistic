import type {ManualMcpConfig} from './client';

export const MCP_SERVER_NAME = 'stagistic';

/*
 * The `mcpServers` wrapper is what most stdio clients read. The command is the
 * prepared executable's absolute path, so it is serialized as-is: no `~`, no
 * shell escaping, spaces and diacritics left to JSON.
 */
export const formatManualMcpConfig = ({command, args}: Pick<ManualMcpConfig, 'args' | 'command'>): string => JSON.stringify(
    {mcpServers: {[MCP_SERVER_NAME]: {command, args}}},
    null,
    2,
);

/** A Tauri command rejects with the backend's user-facing message as a plain string. */
export const toMcpErrorMessage = (error: unknown, fallback: string): string => (typeof error === 'string' && error.trim() ? error : fallback);
