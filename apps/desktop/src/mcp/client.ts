import {invoke} from '@tauri-apps/api/core';

import {markManualMcpPrepared} from './reprepareOnReleaseChange';

export interface McpAdminStatus {
    enabled: boolean,
    ready: boolean,
    protocol_version: number,
    bridge_version: string,
}
export interface ManualMcpConfig {
    command: string,
    args: string[],
    version: string,
}
export const getMcpStatus = () => invoke<McpAdminStatus>('mcp_status');
export const enableMcp = () => invoke<void>('mcp_enable');
export const disableMcp = () => invoke<void>('mcp_disable');
export const prepareManualMcp = async () => {
    const config = await invoke<ManualMcpConfig>('mcp_prepare_manual');

    markManualMcpPrepared(localStorage);

    return config;
};
export const installMcpToClaude = () => invoke<{status: 'installation_requested'}>('mcp_install_claude');
