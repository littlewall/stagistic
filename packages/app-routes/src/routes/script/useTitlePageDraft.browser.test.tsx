import type {TitlePageSettings} from '@stagistic/script';
import {StrictMode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useTitlePageDraft} from './useTitlePageDraft';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const TestHarness = ({
    scriptId,
    repository,
}: {
    scriptId: string | null,
    repository: {
        loadTitlePage: (id: string) => Promise<TitlePageSettings | null>,
        saveTitlePage: (id: string, settings: TitlePageSettings) => Promise<void>,
    },
}) => {
    const {
        titlePageDraft, isLoading, updateTitlePage,
    } = useTitlePageDraft({
        currentScriptId: scriptId,
        repository,
    });

    return (
        <button
            type="button"
            data-testid="edit"
            data-loaded={String(!isLoading)}
            onClick={() => updateTitlePage({subtitle: 'Hello'})}
        >
            {titlePageDraft.subtitle ?? 'no-subtitle'}
        </button>
    );
};

const isHarnessLoaded = () => document.querySelector('[data-testid="edit"]')?.getAttribute('data-loaded') === 'true';

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('useTitlePageDraft persistence wiring', () => {
    /*
     * Under StrictMode (mount → cleanup → mount) with an async load, an earlier
     * bug marked the script "loaded" before the await resolved, so the second
     * mount skipped loading while the first mount's result was discarded —
     * leaving loadedTitlePage stuck at undefined and the save effect permanently
     * disabled. This asserts an edit still debounce-saves.
     */
    it('debounce-saves an edited title page under StrictMode with an async load', async () => {
        const saveCalls: Array<[string, TitlePageSettings]> = [];
        const repository = {
            loadTitlePage: () => new Promise<TitlePageSettings | null>(resolve => {
                window.setTimeout(() => resolve(null), 20);
            }),
            saveTitlePage: (id: string, settings: TitlePageSettings) => {
                saveCalls.push([id, settings]);

                return Promise.resolve();
            },
        };

        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        mountedRoots.push(root);
        root.render(
            <StrictMode>
                <TestHarness scriptId="s1" repository={repository} />
            </StrictMode>,
        );

        // With the bug, loadedTitlePage never resolves, so the hook stays loading forever.
        await waitFor(isHarnessLoaded);

        await userEvent.click(document.querySelector('[data-testid="edit"]') as HTMLElement);

        await waitFor(() => saveCalls.length > 0);

        expect(saveCalls[0][0]).toBe('s1');
        expect(saveCalls[0][1].subtitle).toBe('Hello');
    });
});
