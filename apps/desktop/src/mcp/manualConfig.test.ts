import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {formatManualMcpConfig, toMcpErrorMessage} from './manualConfig';

describe('manual MCP configuration', () => {
    it('wraps the prepared executable in an mcpServers entry', () => {
        const config = formatManualMcpConfig({
            command: '/Users/jana/Library/Application Support/com.stagistic.editor/mcp/server/stagistic-mcp',
            args: [],
        });

        expect(JSON.parse(config)).toEqual({
            mcpServers: {
                stagistic: {
                    command: '/Users/jana/Library/Application Support/com.stagistic.editor/mcp/server/stagistic-mcp',
                    args: [],
                },
            },
        });
    });

    it('keeps spaces, diacritics and quotes in the path intact', () => {
        const command = '/Users/Žofie "Z"/Library/Application Support/stagistic-mcp';

        expect(JSON.parse(formatManualMcpConfig({command, args: []}))).toEqual({mcpServers: {stagistic: {command, args: []}}});
    });

    it('shows the backend message and falls back for anything else', () => {
        expect(toMcpErrorMessage('Could not open Claude Desktop.', 'Fallback')).toBe('Could not open Claude Desktop.');
        expect(toMcpErrorMessage(new Error('internal'), 'Fallback')).toBe('Fallback');
        expect(toMcpErrorMessage('  ', 'Fallback')).toBe('Fallback');
    });
});
