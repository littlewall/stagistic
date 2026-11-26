import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    createUpdateController,
    type UpdateControllerPorts,
    type UpdateState,
} from './updateController';

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((done, fail) => {
        resolve = done;
        reject = fail;
    });

    return {
        promise,
        resolve,
        reject,
    };
};

const setup = (overrides: Partial<UpdateControllerPorts> = {}) => {
    const timers: Array<{
        callback: () => void,
        ms: number,
        cleared: boolean,
    }> = [];
    const install = vi.fn(() => Promise.resolve());
    const restart = vi.fn(() => Promise.resolve('completed' as const));
    let online = true;
    const ports: UpdateControllerPorts = {
        checkForUpdate: vi.fn(() => Promise.resolve({release: '1.0.1', install})),
        isOnline: () => online,
        now: () => new Date(2026, 10, 24, 10, 42),
        setTimer: (callback, ms) => {
            const timer = {
                callback,
                ms,
                cleared: false,
            };

            timers.push(timer);

            return timer;
        },
        clearTimer: handle => {
            (handle as {cleared: boolean}).cleared = true;
        },
        reportError: vi.fn(),
        ...overrides,
    };
    const controller = createUpdateController(ports, {requestRestart: restart});
    const states: UpdateState[] = [];

    controller.subscribe(() => states.push(controller.getState()));

    return {
        controller,
        ports,
        install,
        restart,
        states,
        timers,
        setOnline: (value: boolean) => {
            online = value;
        },
    };
};

const noUpdate = () => Promise.resolve(null);

describe('update controller', () => {
    it('starts idle and checks, downloads and installs into ready', async () => {
        const {controller, states} = setup();

        expect(controller.getState()).toEqual({status: 'idle'});
        await controller.checkInBackground();
        expect(states.map(state => state.status)).toEqual([
            'checking',
            'downloading',
            'ready',
        ]);
        expect(controller.getState()).toEqual({status: 'ready', release: '1.0.1'});
    });

    it('reports up to date with the check time', async () => {
        const {controller} = setup({checkForUpdate: noUpdate});

        await controller.checkInBackground();
        expect(controller.getState()).toEqual({status: 'up-to-date', checkedAt: new Date(2026, 10, 24, 10, 42)});
    });

    it('checks after start, then every 6 hours until stopped', async () => {
        const {
            controller,
            ports,
            timers,
        } = setup({checkForUpdate: vi.fn(noUpdate)});
        const stop = controller.start();

        await vi.waitFor(() => expect(ports.checkForUpdate).toHaveBeenCalledTimes(1));

        const intervals = () => timers.filter(timer => timer.ms === 6 * 60 * 60 * 1000);

        await vi.waitFor(() => expect(intervals()).toHaveLength(1));
        intervals()[0]?.callback();
        await vi.waitFor(() => expect(ports.checkForUpdate).toHaveBeenCalledTimes(2));
        await vi.waitFor(() => expect(intervals()).toHaveLength(2));
        stop();
        expect(intervals()[1]?.cleared).toBe(true);
    });

    it('never overlaps checks: a second request joins the running one', async () => {
        const pending = deferred<null>();
        const {controller, ports} = setup({checkForUpdate: () => pending.promise});
        const first = controller.checkNow();
        const second = controller.checkNow();
        const background = controller.checkInBackground();

        pending.resolve(null);
        expect(await first).toEqual(await second);
        await background;
        expect(ports.reportError).not.toHaveBeenCalled();
    });

    it('skips background checks while offline but still schedules the next one', async () => {
        const {
            controller,
            ports,
            setOnline,
            timers,
        } = setup();

        setOnline(false);
        controller.start();
        await vi.waitFor(() => expect(timers).toHaveLength(1));
        expect(ports.checkForUpdate).not.toHaveBeenCalled();
        expect(controller.getState()).toEqual({status: 'idle'});
    });

    it('keeps a background failure in state and retries on the next check', async () => {
        const check = vi.fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce(null);
        const {controller, ports} = setup({checkForUpdate: check});

        await controller.checkInBackground();
        expect(controller.getState()).toEqual({status: 'failed'});
        expect(ports.reportError).toHaveBeenCalled();
        await controller.checkNow();
        expect(controller.getState().status).toBe('up-to-date');
    });

    it('fails when the download or install fails', async () => {
        const {controller} = setup({
            checkForUpdate: () => Promise.resolve({release: '1.0.1', install: () => Promise.reject(new Error('disk'))}),
        });

        expect(await controller.checkNow()).toEqual({kind: 'failed'});
        expect(controller.getState()).toEqual({status: 'failed'});
    });

    it('returns manual check results', async () => {
        const update = setup();

        expect(await update.controller.checkNow()).toEqual({kind: 'ready', release: '1.0.1'});

        const current = setup({checkForUpdate: noUpdate});

        expect(await current.controller.checkNow()).toEqual({kind: 'up-to-date', checkedAt: new Date(2026, 10, 24, 10, 42)});

        const failing = setup({checkForUpdate: () => Promise.reject(new Error('x'))});

        expect(await failing.controller.checkNow()).toEqual({kind: 'failed'});
    });

    it('does not download again once a Release is ready', async () => {
        const {controller, ports} = setup();

        await controller.checkNow();
        expect(await controller.checkNow()).toEqual({kind: 'ready', release: '1.0.1'});
        await controller.checkInBackground();
        expect(ports.checkForUpdate).toHaveBeenCalledTimes(1);
    });

    it('restarts through the safe shutdown only on request', async () => {
        const {controller, restart} = setup();

        await controller.checkNow();
        expect(restart).not.toHaveBeenCalled();
        await controller.restart();
        expect(restart).toHaveBeenCalledTimes(1);
    });

    it('ignores restart when nothing is ready', async () => {
        const {controller, restart} = setup();

        expect(await controller.restart()).toBe('ignored');
        expect(restart).not.toHaveBeenCalled();
    });

    it('fails and releases the check when the update check never answers', async () => {
        const {
            controller,
            timers,
            ports,
        } = setup({checkForUpdate: vi.fn(() => new Promise<never>(() => {}))});
        const pending = controller.checkNow();

        timers.find(timer => timer.ms === 30_000)?.callback();
        expect(await pending).toEqual({kind: 'failed'});
        expect(controller.getState()).toEqual({status: 'failed'});
        expect(ports.reportError).toHaveBeenCalled();

        // `running` is released: a new check starts.
        void controller.checkNow();
        expect(ports.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('fails when the download never finishes', async () => {
        const {controller, timers} = setup({
            checkForUpdate: vi.fn(() => Promise.resolve({release: '1.0.1', install: () => new Promise<never>(() => {})})),
        });
        const pending = controller.checkNow();

        await vi.waitFor(() => expect(timers.some(timer => timer.ms === 10 * 60_000)).toBe(true));
        timers.find(timer => timer.ms === 10 * 60_000)?.callback();
        expect(await pending).toEqual({kind: 'failed'});
    });
});
