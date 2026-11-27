import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    createDesktopController,
    type DesktopControllerPorts,
    type SettleResult,
} from './desktopController';

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => {
        resolve = done;
    });

    return {promise, resolve};
};

const setup = (overrides: Partial<DesktopControllerPorts> = {}) => {
    const calls: string[] = [];
    const timers: Array<{callback: () => void, cleared: boolean}> = [];
    const ports: DesktopControllerPorts = {
        settleUnsavedWork: () => {
            calls.push('settle');

            return Promise.resolve<SettleResult>('saved');
        },
        hasUnsavedWork: () => false,
        flush: () => {
            calls.push('flush');

            return Promise.resolve();
        },
        writeBackup: () => {
            calls.push('backup');

            return Promise.resolve();
        },
        exit: () => {
            calls.push('exit');

            return Promise.resolve();
        },
        relaunch: () => {
            calls.push('relaunch');

            return Promise.resolve();
        },
        confirmQuitAnyway: () => {
            calls.push('dialog');

            return Promise.resolve(true);
        },
        setTimer: callback => {
            const timer = {callback, cleared: false};

            timers.push(timer);

            return timer;
        },
        clearTimer: handle => {
            (handle as {cleared: boolean}).cleared = true;
        },
        reportError: vi.fn(),
        ...overrides,
    };

    return {
        calls,
        timers,
        ports,
        controller: createDesktopController(ports),
    };
};

describe('desktop controller safe shutdown', () => {
    it('settles, flushes, backs up, then exits', async () => {
        const {calls, controller} = setup();

        expect(await controller.requestQuit()).toBe('completed');
        expect(calls).toEqual([
            'settle',
            'flush',
            'backup',
            'exit',
        ]);
    });

    it('waits for unsaved work before flushing', async () => {
        const gate = deferred<SettleResult>();
        const {calls, controller} = setup({
            settleUnsavedWork: () => {
                calls.push('settle');

                return gate.promise;
            },
        });
        const pending = controller.requestQuit();

        await Promise.resolve();
        expect(calls).toEqual(['settle']);
        gate.resolve('saved');
        await pending;
        expect(calls).toEqual([
            'settle',
            'flush',
            'backup',
            'exit',
        ]);
    });

    it('exits when the bound passes before saving finishes', async () => {
        const {
            calls,
            timers,
            controller,
        } = setup({settleUnsavedWork: () => new Promise<SettleResult>(() => {})});
        const pending = controller.requestQuit();

        timers[0].callback();
        expect(await pending).toBe('timed-out');
        expect(calls).toEqual(['exit']);
    });

    it('asks before leaving when the bound passes while text is still unsaved', async () => {
        const {
            calls,
            timers,
            controller,
        } = setup({
            settleUnsavedWork: () => new Promise<SettleResult>(() => {}),
            hasUnsavedWork: () => true,
        });
        const pending = controller.requestQuit();

        timers[0].callback();
        expect(await pending).toBe('forced');
        expect(calls).toEqual(['dialog', 'exit']);
    });

    it('stays open when the user cancels after a timeout with unsaved text', async () => {
        const {
            calls,
            timers,
            controller,
        } = setup({
            settleUnsavedWork: () => new Promise<SettleResult>(() => {}),
            hasUnsavedWork: () => true,
            confirmQuitAnyway: () => Promise.resolve(false),
        });
        const pending = controller.requestQuit();

        timers[0].callback();
        expect(await pending).toBe('cancelled');
        expect(calls).toEqual([]);
    });

    it('does not let a failed backup block exit', async () => {
        const {
            calls,
            controller,
            ports,
        } = setup({
            writeBackup: () => Promise.reject(new Error('disk full')),
        });

        expect(await controller.requestQuit()).toBe('completed');
        expect(calls).toEqual([
            'settle',
            'flush',
            'exit',
        ]);
        expect(ports.reportError).toHaveBeenCalled();
    });

    it('failed save: Cancel keeps the app open and allows a later quit', async () => {
        let answer = false;
        const {calls, controller} = setup({
            settleUnsavedWork: () => Promise.resolve<SettleResult>('failed'),
            confirmQuitAnyway: () => Promise.resolve(answer),
        });

        expect(await controller.requestQuit()).toBe('cancelled');
        expect(calls).toEqual([]);
        expect(controller.isShuttingDown()).toBe(false);

        answer = true;
        expect(await controller.requestQuit()).toBe('forced');
        expect(calls).toEqual(['exit']);
    });

    it('failed flush asks the same question', async () => {
        const {calls, controller} = setup({
            flush: () => Promise.reject(new Error('fs')),
        });

        expect(await controller.requestQuit()).toBe('forced');
        expect(calls).toEqual([
            'settle',
            'dialog',
            'exit',
        ]);
    });

    it('ignores a second request while one runs', async () => {
        const gate = deferred<SettleResult>();
        const {calls, controller} = setup({settleUnsavedWork: () => gate.promise});
        const first = controller.requestQuit();

        expect(await controller.requestQuit()).toBe('ignored');
        expect(await controller.requestRestart()).toBe('ignored');
        gate.resolve('saved');
        expect(await first).toBe('completed');
        expect(calls).toEqual([
            'flush',
            'backup',
            'exit',
        ]);
    });

    it('restart runs the same sequence then relaunches', async () => {
        const {calls, controller} = setup();

        expect(await controller.requestRestart()).toBe('completed');
        expect(calls).toEqual([
            'settle',
            'flush',
            'backup',
            'relaunch',
        ]);
    });

    it('tells the failed-save prompt which leave is asked about', async () => {
        const asked: string[] = [];
        const {controller} = setup({
            settleUnsavedWork: () => Promise.resolve<SettleResult>('failed'),
            confirmQuitAnyway: kind => {
                asked.push(kind);

                return Promise.resolve(false);
            },
        });

        await controller.requestQuit();
        await controller.requestRestart();
        expect(asked).toEqual(['quit', 'restart']);
    });

    it('clears the bound timer once finished', async () => {
        const {timers, controller} = setup();

        await controller.requestQuit();
        expect(timers[0].cleared).toBe(true);
    });
});
