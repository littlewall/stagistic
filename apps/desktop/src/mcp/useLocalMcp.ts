import {createLocalMcpReadService} from '@stagistic/db';
import {invoke} from '@tauri-apps/api/core';
import {getCurrentWebview} from '@tauri-apps/api/webview';
import {useEffect} from 'react';

import {getLocalDb} from '../db';
import {startMcpReadBridge} from './startMcpReadBridge';

const service = createLocalMcpReadService({getDb: getLocalDb});

export const useLocalMcp = (ready: boolean): void => {
    useEffect(() => {
        if (!ready) {
            return undefined;
        }

        const abort = new AbortController();
        const started = startMcpReadBridge({
            service,
            signal: abort.signal,
            transport: {
                listen: handler => getCurrentWebview().listen('stagistic:mcp-request', event => {
                    handler(event.payload);
                }),
                attach: () => invoke<string>('mcp_attach'),
                detach: generation => invoke('mcp_detach', {generation}),
                reply: reply => invoke('mcp_reply', {reply}),
            },
        });

        void started.catch(() => {
            console.error('Local MCP could not attach.');
        });

        return () => {
            abort.abort();
            void started.then(dispose => dispose()).catch(() => undefined);
        };
    }, [ready]);
};
