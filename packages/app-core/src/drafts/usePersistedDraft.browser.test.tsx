import {
    StrictMode,
    useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {usePersistedDraft} from './usePersistedDraft';

const roots: Root[] = [];

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for persisted draft');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({persist}: {persist: (key: string, value: string) => Promise<void>}) => {
    const [confirmed, setConfirmed] = useState('Initial');
    const draft = usePersistedDraft({
        entityKey: 'script-1',
        confirmedValue: confirmed,
        isHydrated: true,
        defaultValue: '',
        debounceMs: 0,
        persist,
    });

    return (
        <>
            <button type="button" onClick={() => draft.setDraft('Changed')}>change</button>
            <button type="button" onClick={() => setConfirmed('External')}>external</button>
            <output>{draft.draft}:{draft.status}</output>
        </>
    );
};

describe('usePersistedDraft', () => {
    it('survives StrictMode setup cleanup without saving hydrated data', async () => {
        const persist = vi.fn(() => Promise.resolve());
        const host = document.createElement('div');
        const root = createRoot(host);

        roots.push(root);
        document.body.appendChild(host);
        root.render(
            <StrictMode>
                <Harness persist={persist} />
            </StrictMode>,
        );
        await waitFor(() => host.textContent?.includes('Initial:idle') ?? false);

        expect(persist).not.toHaveBeenCalled();

        (host.querySelector('button') as HTMLButtonElement).click();
        await waitFor(() => persist.mock.calls.length === 1);
        await waitFor(() => host.textContent?.includes('Changed:saved') ?? false);

        expect(persist).toHaveBeenCalledWith('script-1', 'Changed');
    });
});
