import {getScriptBlockNodeType} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createInitialScriptDocument} from './initialScriptDocument';

describe('createInitialScriptDocument', () => {
    it('maps the modal choice to document structure', () => {
        expect(createInitialScriptDocument('multi-act').content.map(node => getScriptBlockNodeType(node)))
            .toEqual(['act', 'scene']);
        expect(createInitialScriptDocument('one-act').content.map(node => getScriptBlockNodeType(node)))
            .toEqual(['scene']);
    });
});
