import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vite-plus/test';

import type {ScriptEditorController} from './controller/types';
import {ScriptWorkspaceProvider, useScriptWorkspace} from './ScriptWorkspaceContext';

const stubController = {currentScriptId: 's1'} as unknown as ScriptEditorController;

const Probe = () => {
    const {currentScriptId} = useScriptWorkspace();

    return <span>{currentScriptId}</span>;
};

describe('useScriptWorkspace', () => {
    it('returns the provided controller inside the provider', () => {
        const markup = renderToStaticMarkup(
            <ScriptWorkspaceProvider value={stubController}>
                <Probe />
            </ScriptWorkspaceProvider>,
        );

        expect(markup).toContain('s1');
    });

    it('throws when used outside the provider', () => {
        expect(() => renderToStaticMarkup(<Probe />)).toThrow(/ScriptWorkspaceProvider/);
    });
});
