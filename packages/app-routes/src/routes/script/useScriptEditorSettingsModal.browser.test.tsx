import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import type {NavigateFunction} from 'react-router-dom';
import {afterEach, describe, expect, it} from 'vite-plus/test';

import {useScriptEditorSettingsModal} from './useScriptEditorSettingsModal';

const roots: Root[] = [];

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(resolvePromise => {
        resolve = resolvePromise;
    });

    return {promise, resolve};
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for script deletion');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({deleteScript}: {deleteScript: (scriptId: string) => Promise<void>}) => {
    const [pathname, setPathname] = useState('/script/script-1/editor');
    const {handleDeleteScript} = useScriptEditorSettingsModal({
        currentScriptId: 'script-1',
        navigate: ((to: string) => setPathname(to)) as NavigateFunction,
        searchParams: new URLSearchParams(),
        setSearchParams: () => undefined,
        deleteScript,
    });

    return (
        <>
            <output>{pathname}</output>
            <button type="button" onClick={() => void handleDeleteScript()}>
                Delete
            </button>
        </>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useScriptEditorSettingsModal', () => {
    it('leaves the editor while script deletion is still pending', async () => {
        const gate = deferred();
        let deletionStarted = false;
        const host = document.createElement('div');
        const root = createRoot(host);

        roots.push(root);
        document.body.appendChild(host);
        root.render(
            <Harness
                deleteScript={() => {
                    deletionStarted = true;

                    return gate.promise;
                }}
            />,
        );
        await waitFor(() => host.querySelector('button') !== null);

        host.querySelector('button')?.click();
        await waitFor(() => deletionStarted);

        expect(host.querySelector('output')?.textContent).toBe('/');

        gate.resolve();
    });
});
