import {StartFailureError} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {BootFailureScreen} from './BootFailureScreen';
import {useAppBootstrap} from './useAppBootstrap';
import {WaitingForDatabaseScreen} from './WaitingForDatabaseScreen';

const services = {scriptRepository: 'ready'};

type Options = Parameters<typeof useAppBootstrap<typeof services>>[0];

const roots: Root[] = [];
const onReload = vi.fn();

const Harness = ({options}: {options: Options}) => {
    const {
        services: loaded,
        bootStatus,
        bootProgress,
        failure,
        waitingNotice,
        waitingSilent,
    } = useAppBootstrap(options);

    if (failure) {
        return <BootFailureScreen surface="web" failure={failure} />;
    }

    if (waitingNotice) {
        return <WaitingForDatabaseScreen status={bootStatus} progress={bootProgress} canReload={waitingSilent} onReload={onReload} />;
    }

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

    it.each([
        ['older-version-running', 'An older version of Stagistic is running'],
        ['database-newer-than-app', 'Your scripts need a newer Release of Stagistic'],
        ['migration-failed', 'Stagistic could not update your database'],
    ] as const)('ends on the %s screen when the database fails to start', async (kind, title) => {
        const {container} = mount({
            prepareDatabase: () => Promise.reject(new StartFailureError(kind, 'details')),
            loadRepository: vi.fn(() => Promise.resolve(services)),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(title);
    });

    it('ends on the generic screen for an untyped failure', async () => {
        const options: Options = {
            prepareDatabase: () => Promise.reject(new Error('Worker blew up')),
            loadRepository: vi.fn(() => Promise.resolve(services)),
        };
        const {container} = mount(options);

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
        expect(container.querySelector('pre')?.textContent).toBe('Worker blew up');
        expect(options.loadRepository).not.toHaveBeenCalled();
    });

    it('ends on the generic screen when the repository cannot load', async () => {
        const {container} = mount({
            prepareDatabase: () => Promise.resolve(),
            loadRepository: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
    });

    it('ends on the generic screen when the database never answers', async () => {
        const options: Options = {
            stallTimeoutMs: 50,
            prepareDatabase: () => new Promise<void>(() => {}),
            loadRepository: vi.fn(() => Promise.resolve(services)),
        };
        const {container} = mount(options);

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
        expect(container.querySelector('pre')?.textContent).toContain('did not respond');
        expect(options.loadRepository).not.toHaveBeenCalled();
    });

    it('ignores a database that finishes after the timeout', async () => {
        let finish = () => {};
        const options: Options = {
            stallTimeoutMs: 30,
            prepareDatabase: () => new Promise<void>(resolve => {
                finish = resolve;
            }),
            loadRepository: vi.fn(() => Promise.resolve(services)),
        };
        const {container} = mount(options);

        await expect.poll(() => container.querySelector('h1')).not.toBeNull();
        finish();
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(container.querySelector('h1')).not.toBeNull();
        expect(options.loadRepository).not.toHaveBeenCalled();
    });

    it('keeps waiting while the database reports progress', async () => {
        const {container} = mount({
            stallTimeoutMs: 80,
            prepareDatabase: async onProgress => {
                for (let step = 1; step <= 4; step += 1) {
                    await new Promise(resolve => setTimeout(resolve, 40));
                    onProgress({label: `Step ${step}`, progress: step / 4});
                }
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.textContent).toBe('ready');
    });

    it('does not time out a step that is allowed to run long, such as migrations', async () => {
        const {container} = mount({
            stallTimeoutMs: 40,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Applying migrations',
                    progress: 0.8,
                    longRunning: true,
                });
                await new Promise(resolve => setTimeout(resolve, 150));
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.textContent).toBe('ready');
    });

    it('shows the older-version screen while blocked, past the stall limit, and starts by itself on release', async () => {
        let release = () => {};
        const {container} = mount({
            stallTimeoutMs: 30,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Waiting for an older version',
                    progress: 0.1,
                    blocked: {kind: 'older-version-running', message: ''},
                });
                await new Promise<void>(resolve => {
                    release = resolve;
                });
                onProgress({label: 'Starting local database', progress: 0.1});
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('An older version of Stagistic is running');
        await new Promise(resolve => setTimeout(resolve, 80));
        expect(container.querySelector('h1')?.textContent).toBe('An older version of Stagistic is running');

        release();
        await expect.poll(() => container.textContent).toBe('ready');
    });

    it('restarts the stall limit once the older version has let go', async () => {
        const {container} = mount({
            stallTimeoutMs: 40,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Waiting for an older version',
                    progress: 0.1,
                    blocked: {kind: 'older-version-running', message: ''},
                });
                await new Promise(resolve => setTimeout(resolve, 20));
                onProgress({label: 'Starting local database', progress: 0.1});
                await new Promise<void>(() => {});
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
    });

    it('times out again when the long step is followed by silence', async () => {
        const {container} = mount({
            stallTimeoutMs: 40,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Applying migrations',
                    progress: 0.8,
                    longRunning: true,
                });
                await new Promise(resolve => setTimeout(resolve, 60));
                onProgress({label: 'Finalizing', progress: 1});
                await new Promise<void>(() => {});
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
    });

    it('shows an explanatory screen while waiting for the database, then starts by itself', async () => {
        let release = () => {};
        const {container} = mount({
            waitingTimeoutMs: 40,
            stallTimeoutMs: 500,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Waiting for another Stagistic tab',
                    progress: 0.2,
                    longRunning: true,
                    waitsForDatabase: true,
                });
                await new Promise<void>(resolve => {
                    release = resolve;
                });
                onProgress({label: 'Finalizing', progress: 1});
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic is still starting');
        expect(container.textContent).not.toContain('one tab');

        release();
        await expect.poll(() => container.textContent).toBe('ready');
    });

    it('does not show the waiting screen for a step that is only long running', async () => {
        const {container} = mount({
            waitingTimeoutMs: 40,
            stallTimeoutMs: 500,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Applying migrations',
                    progress: 0.8,
                    longRunning: true,
                });
                await new Promise(resolve => setTimeout(resolve, 80));
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.textContent).toBe('ready');
        expect(container.querySelector('h1')).toBeNull();
    });

    it('clears a stall failure when the database reports progress again', async () => {
        let report: Parameters<Options['prepareDatabase']>[0] = () => {};
        let finish = () => {};
        const {container} = mount({
            stallTimeoutMs: 30,
            prepareDatabase: onProgress => new Promise<void>(resolve => {
                report = onProgress;
                finish = resolve;
            }),
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
        report({
            label: 'Opening scripts',
            progress: 0.5,
            longRunning: true,
        });
        await expect.poll(() => container.querySelector('h1')).toBeNull();

        finish();
        await expect.poll(() => container.textContent).toBe('ready');
    });

    it('replaces the generic stall message with the real reason when the database then fails', async () => {
        let fail: (error: Error) => void = () => {};
        const {container} = mount({
            stallTimeoutMs: 30,
            prepareDatabase: () => new Promise<void>((_resolve, reject) => {
                fail = reject;
            }),
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('pre')?.textContent).toContain('did not respond');
        fail(new StartFailureError('migration-failed', 'Migration 2026 failed: syntax error'));
        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not update your database');
        expect(container.querySelector('pre')?.textContent).toContain('syntax error');
    });

    it('keeps the migration progress on the waiting screen and offers a reload only after long silence', async () => {
        const {container} = mount({
            waitingTimeoutMs: 20,
            silenceTimeoutMs: 120,
            stallTimeoutMs: 1_000,
            prepareDatabase: async onProgress => {
                onProgress({
                    label: 'Applying migrations',
                    progress: 0.6,
                    longRunning: true,
                    waitsForDatabase: true,
                });
                await new Promise<void>(() => {});
            },
            loadRepository: () => Promise.resolve(services),
        });

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic is still starting');
        expect(container.textContent).toContain('Applying migrations');
        expect(container.querySelector('progress')?.value).toBeCloseTo(0.6);
        expect(container.querySelector('button')).toBeNull();
        expect(container.textContent).not.toContain('one tab');

        await expect.poll(() => container.querySelector('button')?.textContent).toBe('Reload');
        expect(container.textContent).toContain('Applying migrations');
        container.querySelector('button')?.click();
        expect(onReload).toHaveBeenCalledTimes(1);
    });
});
