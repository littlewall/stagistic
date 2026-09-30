import type {
    ScriptRepository,
    ScriptTitlePageRecord,
} from '@stagistic/app-core';
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
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for title-page draft');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const createRepository = () => {
    let rows: readonly ScriptTitlePageRecord[] = [];
    const listeners = new Set<(value: readonly ScriptTitlePageRecord[]) => void>();
    const saveCalls: TitlePageSettings[] = [];
    const source = {
        read: () => Promise.resolve(rows),
        subscribe: async (listener: (value: readonly ScriptTitlePageRecord[]) => void) => {
            listeners.add(listener);
            await new Promise(resolve => window.setTimeout(resolve, 20));
            listener(rows);

            return () => {
                listeners.delete(listener);
            };
        },
        refresh: () => {
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
    };
    const repository = {
        getScriptTitlePageSource: () => source,
        saveTitlePage: (scriptId: string, settings: TitlePageSettings) => {
            saveCalls.push(settings);
            rows = [{scriptId, settings}];
            listeners.forEach(listener => listener(rows));

            return Promise.resolve();
        },
        deleteTitlePage: () => Promise.resolve(),
    } as unknown as ScriptRepository;

    return {repository, saveCalls};
};

const TestHarness = ({repository}: {repository: ScriptRepository}) => {
    const draft = useTitlePageDraft({
        currentScriptId: 'script-1',
        repository,
    });

    return (
        <button
            type="button"
            data-loaded={String(!draft.isLoading)}
            onClick={() => draft.updateTitlePage({subtitle: 'Hello'})}
        >
            {draft.titlePageDraft.subtitle ?? 'no-subtitle'}:{draft.titlePageDraftStatus}
        </button>
    );
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('useTitlePageDraft', () => {
    it('hydrates and saves under StrictMode', async () => {
        const {repository, saveCalls} = createRepository();
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        mountedRoots.push(root);
        root.render(
            <StrictMode>
                <TestHarness repository={repository} />
            </StrictMode>,
        );
        await waitFor(() => host.querySelector('button')?.dataset.loaded === 'true');

        await userEvent.click(host.querySelector('button') as HTMLButtonElement);
        await waitFor(() => saveCalls.length === 1);
        await waitFor(() => host.textContent?.includes('Hello:saved') ?? false);

        expect(saveCalls[0]?.subtitle).toBe('Hello');
    });
});
