import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {useAppBootstrap} from './useAppBootstrap';

const services = {scriptRepository: 'ready'};

type Options = Parameters<typeof useAppBootstrap<typeof services>>[0];

const roots: Root[] = [];

const Harness = ({options}: {options: Options}) => {
    const {
        services: loaded,
        bootStatus,
        bootProgress,
    } = useAppBootstrap(options);

    return <p>{loaded?.scriptRepository ?? `${bootStatus}: ${bootProgress}`}</p>;
};

const mount = (options: Options) => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(<Harness options={options} />);

    return {root, container};
};

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

describe('application bootstrap', () => {
    it('prepares persistent storage before the database and loads the repository only once', async () => {
        const order: string[] = [];
        const options: Options = {
            beforeDatabase: () => {
                order.push('persist');

                return Promise.resolve();
            },
            prepareDatabase: onProgress => {
                order.push('database');
                onProgress({label: 'Database ready', progress: 1});

                return Promise.resolve();
            },
            loadRepository: vi.fn(() => {
                order.push('repository');

                return Promise.resolve(services);
            }),
        };
        const {root, container} = mount(options);

        await expect.poll(() => container.textContent).toBe('ready');
        expect(order).toEqual([
            'persist',
            'database',
            'repository',
        ]);
        root.render(<Harness options={options} />);
        await expect.poll(() => container.textContent).toBe('ready');
        expect(options.loadRepository).toHaveBeenCalledTimes(1);
    });

    it('does not start the database after unmounting during the storage request', async () => {
        let finishStorage = () => {};
        const storage = new Promise<void>(resolve => {
            finishStorage = resolve;
        });
        const beforeDatabase = vi.fn(() => storage);
        const options: Options = {
            beforeDatabase,
            prepareDatabase: vi.fn(() => Promise.resolve()),
            loadRepository: vi.fn(() => Promise.resolve(services)),
        };
        const {root} = mount(options);

        await expect.poll(() => beforeDatabase.mock.calls.length).toBe(1);
        root.unmount();
        finishStorage();
        await storage;
        expect(options.prepareDatabase).not.toHaveBeenCalled();
        expect(options.loadRepository).not.toHaveBeenCalled();
    });
});
