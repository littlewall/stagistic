import {invoke} from '@tauri-apps/api/core';

export interface McpAdminStatus {
    enabled: boolean,
    ready: boolean,
    protocol_version: number,
    bridge_version: string,
}
export const getMcpStatus = () => invoke<McpAdminStatus>('mcp_status');
export const enableMcp = () => invoke<void>('mcp_enable');
export const disableMcp = () => invoke<void>('mcp_disable');
export const prepareManualMcp = () => invoke<{
    command: string,
    args: string[],
    version: string,
}>('mcp_prepare_manual');
export const installMcpToClaude = () => invoke<{status: 'installation_requested'}>('mcp_install_claude');
