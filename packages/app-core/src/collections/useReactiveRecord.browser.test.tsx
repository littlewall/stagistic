import {createInMemoryReactiveQuerySource} from '@stagistic/db';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createReactiveCollection} from './createReactiveCollection';
import {useReactiveRecord} from './useReactiveRecord';

const createStore = (title: string) => {
    const source = createInMemoryReactiveQuerySource([{id: 'record', title}]);
    const store = createReactiveCollection({
        id: crypto.randomUUID(),
        source,
        getKey: row => row.id,
    });

    return {
        ...store,
        save: vi.fn(async (_value: string) => {}),
        source,
    };
};

type Store = ReturnType<typeof createStore>;

const Harness = ({store}: {store: Store | null}) => {
    const {
        record,
        isLoading,
        error,
        save,
    } = useReactiveRecord(store);

    return (
        <button type="button" onClick={() => void save('saved')}>
            {JSON.stringify({
                title: record?.title ?? null,
                isLoading,
                error: error?.message ?? null,
            })}
        </button>
    );
};

let root: Root | undefined;

afterEach(() => {
    root?.unmount();
    root = undefined;
    document.body.innerHTML = '';
});

const mount = (store: Store | null) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<Harness store={store} />);

    return host;
};

describe('useReactiveRecord', () => {
    it('returns an idle empty record and a harmless save when no script is selected', async () => {
        const host = mount(null);

        await vi.waitFor(() => expect(host.textContent).toBe('{"title":null,"isLoading":false,"error":null}'));
        host.querySelector('button')?.click();
    });

    it('subscribes to the current confirmed record and saves through its current store', async () => {
        const first = createStore('First');
        const second = createStore('Second');
        const host = mount(first);

        await vi.waitFor(() => expect(host.textContent).toContain('"title":"First","isLoading":false'));
        root?.render(<Harness store={second} />);
        await vi.waitFor(() => expect(host.textContent).toContain('"title":"Second","isLoading":false'));

        first.source.emit([{id: 'record', title: 'Late first'}]);
        second.source.emit([{id: 'record', title: 'Updated second'}]);
        await vi.waitFor(() => expect(host.textContent).toContain('"title":"Updated second"'));
        host.querySelector('button')?.click();
        expect(second.save).toHaveBeenCalledWith('saved');
        expect(first.save).not.toHaveBeenCalled();
    });

    it('exposes failed saves and source errors while retaining the confirmed record', async () => {
        const store = createStore('Confirmed');
        const host = mount(store);

        await vi.waitFor(() => expect(host.textContent).toContain('"isLoading":false'));
        store.status.failMutation('record', 'update', new Error('Save failed'));
        await vi.waitFor(() => expect(host.textContent).toContain('"error":"Save failed"'));
        store.confirmed.setError(new Error('Read failed'));
        await vi.waitFor(() => expect(host.textContent).toBe('{"title":"Confirmed","isLoading":false,"error":"Read failed"}'));
    });
});
