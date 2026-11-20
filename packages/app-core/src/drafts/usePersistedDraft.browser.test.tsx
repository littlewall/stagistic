import {hasUnsavedWork} from '@stagistic/shared';
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

import {
    type DatabaseHandover,
    type DatabaseHandoverParticipant,
    DatabaseHandoverProvider,
} from '../database-handover/DatabaseHandoverContext';
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

type KeyedDraftRender = {
    entityKey: string,
    draft: string,
    isHydrated: boolean,
};

const KeyedHarness = ({onRender}: {onRender: (render: KeyedDraftRender) => void}) => {
    const [entityKey, setEntityKey] = useState('script-1');
    const confirmedValue = entityKey === 'script-1' ? 'First' : 'Second';
    const draft = usePersistedDraft({
        entityKey,
        confirmedValue,
        isHydrated: true,
        defaultValue: '',
        persist: () => Promise.resolve(),
    });

    onRender({
        entityKey,
        draft: draft.draft,
        isHydrated: draft.isHydrated,
    });

    return (
        <>
            <button type="button" onClick={() => setEntityKey('script-2')}>switch</button>
            <output>{draft.draft}:{String(draft.isHydrated)}</output>
        </>
    );
};

describe('usePersistedDraft', () => {
    it('never reports a value as hydrated for the wrong entity key', async () => {
        const renders: KeyedDraftRender[] = [];
        const host = document.createElement('div');
        const root = createRoot(host);

        roots.push(root);
        document.body.appendChild(host);
        root.render(<KeyedHarness onRender={render => renders.push(render)} />);

        await waitFor(() => host.textContent?.includes('First:true') ?? false);

        expect(renders[0]).toEqual({
            entityKey: 'script-1',
            draft: 'First',
            isHydrated: true,
        });

        renders.length = 0;
        (host.querySelector('button') as HTMLButtonElement).click();
        await waitFor(() => host.textContent?.includes('Second:true') ?? false);

        expect(renders).toContainEqual({
            entityKey: 'script-2',
            draft: '',
            isHydrated: false,
        });
        expect(renders.at(-1)).toEqual({
            entityKey: 'script-2',
            draft: 'Second',
            isHydrated: true,
        });
    });

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

describe('unsaved work', () => {
    it('is marked from the first edit until the draft is saved', async () => {
        let finish: () => void = () => {};
        const persist = vi.fn(() => new Promise<void>(resolve => {
            finish = resolve;
        }));
        const host = document.createElement('div');
        const root = createRoot(host);

        roots.push(root);
        document.body.appendChild(host);
        root.render(<Harness persist={persist} />);
        await waitFor(() => host.textContent?.includes('Initial:idle') ?? false);

        expect(hasUnsavedWork()).toBe(false);

        (host.querySelector('button') as HTMLButtonElement).click();
        await waitFor(() => persist.mock.calls.length === 1);

        // The save is running but not confirmed yet.
        expect(hasUnsavedWork()).toBe(true);

        finish();
        await waitFor(() => !hasUnsavedWork());
    });

    it('is released when the draft goes away with a save still running', async () => {
        const persist = vi.fn(() => new Promise<void>(() => {}));
        const host = document.createElement('div');
        const root = createRoot(host);

        roots.push(root);
        document.body.appendChild(host);
        root.render(<Harness persist={persist} />);
        await waitFor(() => host.textContent?.includes('Initial:idle') ?? false);
        (host.querySelector('button') as HTMLButtonElement).click();
        await waitFor(() => hasUnsavedWork());

        root.unmount();
        expect(hasUnsavedWork()).toBe(false);
    });
});

describe('a database handover', () => {
    const mountInHandover = (persist: (key: string, value: string) => Promise<void>) => {
        const participants: DatabaseHandoverParticipant[] = [];
        const handover: DatabaseHandover = {
            getState: () => ({status: 'idle'}),
            subscribe: () => () => {},
            addParticipant: participant => {
                participants.push(participant);

                return () => {};
            },
        };
        const Draft = () => {
            const draft = usePersistedDraft({
                entityKey: 'script-1',
                confirmedValue: 'Initial',
                isHydrated: true,
                defaultValue: '',
                debounceMs: 60_000,
                persist,
            });

            return <button type="button" onClick={() => draft.setDraft('Changed')}>change</button>;
        };
        const container = document.body.appendChild(document.createElement('div'));
        const root = createRoot(container);

        roots.push(root);
        root.render(<DatabaseHandoverProvider handover={handover}><Draft /></DatabaseHandoverProvider>);

        return {container, participants};
    };

    it('saves a draft still waiting for its debounce', async () => {
        const persist = vi.fn(() => Promise.resolve());
        const {container, participants} = mountInHandover(persist);

        await waitFor(() => container.querySelector('button') !== null && participants.length === 1);
        container.querySelector('button')?.click();

        await expect(participants[0]?.flush()).resolves.toBe(true);
        expect(persist).toHaveBeenCalledWith('script-1', 'Changed');
    });

    it('reports a draft that could not be saved', async () => {
        const {container, participants} = mountInHandover(() => Promise.reject(new Error('disk full')));

        await waitFor(() => container.querySelector('button') !== null && participants.length === 1);
        container.querySelector('button')?.click();

        await expect(participants[0]?.flush()).resolves.toBe(false);
    });

    it('stops editing and offers the unsaved text of a draft', async () => {
        const persist = vi.fn(() => Promise.resolve());
        const participants: DatabaseHandoverParticipant[] = [];
        const handover: DatabaseHandover = {
            getState: () => ({status: 'idle'}),
            subscribe: () => () => {},
            addParticipant: participant => {
                participants.push(participant);

                return () => {};
            },
        };
        const Draft = () => {
            const draft = usePersistedDraft({
                entityKey: 'script-1',
                confirmedValue: 'Initial',
                isHydrated: true,
                defaultValue: '',
                debounceMs: 30,
                persist,
                toText: value => `Title: ${value}`,
            });

            return <button type="button" onClick={() => draft.setDraft('Changed')}>change</button>;
        };
        const container = document.body.appendChild(document.createElement('div'));
        const root = createRoot(container);

        roots.push(root);
        root.render(<DatabaseHandoverProvider handover={handover}><Draft /></DatabaseHandoverProvider>);
        await waitFor(() => container.querySelector('button') !== null && participants.length === 1);

        expect(participants[0]?.getText?.()).toBe('');
        container.querySelector('button')?.click();
        expect(participants[0]?.getText?.()).toBe('Title: Changed');

        participants[0]?.stopEditing?.();
        await new Promise(resolve => window.setTimeout(resolve, 120));
        expect(persist).not.toHaveBeenCalled();

        await expect(participants[0]?.flush()).resolves.toBe(true);
        expect(persist).toHaveBeenCalledWith('script-1', 'Changed');
        expect(participants[0]?.getText?.()).toBe('');
    });
});
