import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {validateLocalRequest} from './index';

describe('local MCP contract', () => {
    it('rejects mutation names, foreign fields, invalid scopes and excessive search limits', () => {
        for (const operation of [
            {tool: 'delete_script', arguments: {}},
            {tool: 'list_scripts', arguments: {sql: 'select 1'}},
            {tool: 'get_scene', arguments: {script_id: '', scene_id: 'scene'}},
            {
                tool: 'search_script',
                arguments: {
                    script_id: 's',
                    query: 'text',
                    limit: 51,
                },
            },
        ]) {
            expect(() => validateLocalRequest({protocol_version: 1, operation})).toThrow();
        }
    });

    it('accepts stable projection identifiers', () => {
        const request = {protocol_version: 1, operation: {tool: 'get_scene', arguments: {script_id: 's', scene_id: 'rw-scene:s:block'}}};

        expect(validateLocalRequest(request)).toEqual(request);
    });
});
