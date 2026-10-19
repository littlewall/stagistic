import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    disableMcp,
    enableMcp,
    getMcpStatus,
    installMcpToClaude,
    prepareManualMcp,
} from './client';
import {formatManualMcpConfig, toMcpErrorMessage} from './manualConfig';

export interface McpAction {
    isPending: boolean,
    error: string | null,
}

const useMcpAction = (fallbackMessage: string) => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async <Result>(task: () => Promise<Result>): Promise<{ok: true, value: Result} | {ok: false}> => {
        setIsPending(true);
        setError(null);

        try {
            return {ok: true, value: await task()};
        } catch (caught) {
            setError(toMcpErrorMessage(caught, fallbackMessage));

            return {ok: false};
        } finally {
            setIsPending(false);
        }
    }, [fallbackMessage]);

    return {
        state: {isPending, error} satisfies McpAction,
        run,
    };
};

/** Desktop MCP administration: server switch, Claude bundle and manual client configuration. */
export const useMcpSettings = () => {
    // `enabled` is `null` until the first status read; the switch stays disabled meanwhile.
    const [status, setStatus] = useState<{enabled: boolean | null, error: string | null}>({enabled: null, error: null});
    const [manualConfig, setManualConfig] = useState<string | null>(null);
    const server = useMcpAction('Could not change the MCP server.');
    const claude = useMcpAction('Could not open Claude.');
    const manual = useMcpAction('Could not prepare the MCP server.');

    const readStatus = useCallback(() => getMcpStatus().then(
        value => setStatus({enabled: value.enabled, error: null}),
        (error: unknown) => setStatus(current => ({
            enabled: current.enabled,
            error: toMcpErrorMessage(error, 'Could not read the MCP server state.'),
        })),
    ), []);

    useEffect(() => {
        void readStatus();
    }, [readStatus]);

    const setServerEnabled = async (enabled: boolean) => {
        await server.run(enabled ? enableMcp : disableMcp);
        await readStatus();
    };

    // Resolves to whether Claude received the bundle; the installation itself is confirmed in Claude.
    const connectClaude = async (): Promise<boolean> => {
        const result = await claude.run(installMcpToClaude);

        // Installing also turns the server on.
        await readStatus();

        return result.ok;
    };

    const prepareManualConfig = async () => {
        const result = await manual.run(prepareManualMcp);

        if (result.ok) {
            setManualConfig(formatManualMcpConfig(result.value));
        }
    };

    return {
        isEnabled: status.enabled,
        manualConfig,
        server: {...server.state, error: server.state.error ?? status.error} satisfies McpAction,
        claude: claude.state,
        manual: manual.state,
        setServerEnabled,
        connectClaude,
        prepareManualConfig,
    };
};
