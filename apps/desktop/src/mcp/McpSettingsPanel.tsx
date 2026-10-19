import {
    Button,
    ButtonGroup,
    CodeSnippet,
    Notice,
    PanelHeader,
    SettingRow,
    SettingsGroup,
    Switch,
    useToastController,
} from '@stagistic/ui';

import {useMcpSettings} from './useMcpSettings';

const ActionError = ({error}: {error: string | null}) => (error ? <Notice variant="error">{error}</Notice> : null);

export const McpSettingsPanel = () => {
    const {addToast} = useToastController();
    const {
        isEnabled,
        manualConfig,
        server,
        claude,
        manual,
        setServerEnabled,
        connectClaude,
        prepareManualConfig,
    } = useMcpSettings();

    const handleConnectClaude = async () => {
        if (!await connectClaude()) {
            return;
        }

        addToast({
            title: 'Installer opened in Claude',
            description: 'Confirm the installation in Claude to finish connecting.',
            variant: 'success',
        });
    };

    return (
        <SettingsGroup gap="2xl">
            <PanelHeader
                level={3}
                title="MCP"
                description="Lets AI apps on this Mac read your saved scripts while Stagistic is open. Access is read-only; text an app reads becomes part of its conversation."
            />
            <SettingsGroup>
                <SettingRow>
                    <Switch
                        variant="setting"
                        isSelected={isEnabled ?? false}
                        isDisabled={isEnabled === null || server.isPending}
                        onChange={enabled => void setServerEnabled(enabled)}
                    >
                        MCP server
                    </Switch>
                </SettingRow>
                <ActionError error={server.error} />
            </SettingsGroup>
            <SettingsGroup gap="lg">
                <PanelHeader
                    level={4}
                    size="section"
                    title="Claude"
                    description="Adds Stagistic to the Claude desktop app and turns the MCP server on. Claude asks you to confirm."
                />
                <ButtonGroup>
                    <Button
                        variant="primary"
                        isPending={claude.isPending}
                        onPress={() => void handleConnectClaude()}
                    >
                        Connect to Claude
                    </Button>
                </ButtonGroup>
                <ActionError error={claude.error} />
            </SettingsGroup>
            <SettingsGroup gap="lg">
                <PanelHeader
                    level={4}
                    size="section"
                    title="Other apps"
                    description="Any MCP client that starts local stdio servers can connect. Add this entry to its MCP configuration, then keep the MCP server on and Stagistic open. Clients without the mcpServers format need only the command path."
                />
                {manualConfig ? (
                    <CodeSnippet
                        code={manualConfig}
                        copyLabel="Copy configuration"
                    />
                ) : (
                    <ButtonGroup>
                        <Button
                            variant="secondary"
                            isPending={manual.isPending}
                            onPress={() => void prepareManualConfig()}
                        >
                            Show configuration
                        </Button>
                    </ButtonGroup>
                )}
                <ActionError error={manual.error} />
            </SettingsGroup>
        </SettingsGroup>
    );
};
