import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createReleaseUpdateMonitor} from './releaseUpdateMonitor';

const MINUTE = 60_000;
const GENERATION = '27/20261103094608_x/0.3.15';

const manifestResponse = (release: string, init: ResponseInit = {headers: {'content-type': 'application/json'}}) => {
    return new Response(JSON.stringify({release, dbGeneration: GENERATION}), init);
};

const setup = (respond: () => Response | Promise<Response>, options: {isOnline?: () => boolean} = {}) => {
    const fetchManifest = vi.fn<typeof fetch>(() => Promise.resolve(respond()));
    const focusTarget = new EventTarget();
    const monitor = createReleaseUpdateMonitor({
        currentRelease: '0.2.0',
        fetch: fetchManifest,
        focusTarget,
        isOnline: options.isOnline ?? (() => true),
    });
    const stop = monitor.start();
    const focus = async () => {
        focusTarget.dispatchEvent(new Event('focus'));
        await vi.advanceTimersByTimeAsync(0);
    };

    return {
        monitor,
        fetchManifest,
        focus,
        stop,
    };
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('release update monitor', () => {
    it('learns of a newer Release when the window gains focus, asking for a fresh copy', async () => {
        const {
            monitor,
            fetchManifest,
            focus,
        } = setup(() => manifestResponse('0.3.0'));

        expect(monitor.getAvailableRelease()).toBeNull();

        await focus();

        expect(monitor.getAvailableRelease()).toBe('0.3.0');
        expect(fetchManifest).toHaveBeenCalledWith('/version.json', expect.objectContaining({cache: 'no-store'}));
    });

    it('tells subscribers when a newer Release is found', async () => {
        const {monitor, focus} = setup(() => manifestResponse('0.3.0'));
        const listener = vi.fn();

        monitor.subscribe(listener);
        await focus();
        await vi.advanceTimersByTimeAsync(2 * MINUTE);
        await focus();

        expect(listener).toHaveBeenCalledTimes(1);
    });

    it.each([['the same', '0.2.0'], ['an older', '0.1.9']])('does nothing when the server has %s Release', async (_name, release) => {
        const {monitor, focus} = setup(() => manifestResponse(release));

        await focus();

        expect(monitor.getAvailableRelease()).toBeNull();
    });

    it.each([
        ['an HTML page answered with 200', () => new Response('<!doctype html><html></html>', {headers: {'content-type': 'text/html'}})],
        ['JSON with the wrong content type', () => new Response('{"release":"0.3.0","dbGeneration":"27/x/0.3.15"}', {headers: {'content-type': 'text/html'}})],
        ['JSON without a content type', () => new Response('{"release":"0.3.0","dbGeneration":"27/x/0.3.15"}')],
        ['unparsable JSON', () => new Response('{"release":', {headers: {'content-type': 'application/json'}})],
        ['JSON of the wrong shape', () => new Response('{"version":"0.3.0"}', {headers: {'content-type': 'application/json'}})],
        ['an invalid Release number', () => manifestResponse('later')],
        ['an error status', () => manifestResponse('0.3.0', {status: 503, headers: {'content-type': 'application/json'}})],
    ])('ignores %s', async (_name, respond) => {
        const {monitor, focus} = setup(respond);
        const listener = vi.fn();

        monitor.subscribe(listener);
        await focus();

        expect(monitor.getAvailableRelease()).toBeNull();
        expect(listener).not.toHaveBeenCalled();
    });

    it('ignores a network failure and tries again later', async () => {
        let isFailing = true;
        const {
            monitor,
            fetchManifest,
            focus,
        } = setup(() => {
            if (isFailing) {
                throw new TypeError('Failed to fetch');
            }

            return manifestResponse('0.3.0');
        });

        await focus();
        expect(monitor.getAvailableRelease()).toBeNull();

        isFailing = false;
        await vi.advanceTimersByTimeAsync(2 * MINUTE);
        await focus();

        expect(fetchManifest).toHaveBeenCalledTimes(2);
        expect(monitor.getAvailableRelease()).toBe('0.3.0');
    });

    it('does not check while offline', async () => {
        let isOnline = false;
        const {
            monitor,
            fetchManifest,
            focus,
        } = setup(() => manifestResponse('0.3.0'), {isOnline: () => isOnline});

        await focus();
        await vi.advanceTimersByTimeAsync(31 * MINUTE);
        expect(fetchManifest).not.toHaveBeenCalled();

        isOnline = true;
        await focus();
        expect(monitor.getAvailableRelease()).toBe('0.3.0');
    });

    it('checks again every 30 minutes without any focus', async () => {
        const {monitor, fetchManifest} = setup(() => manifestResponse('0.2.0'));

        await vi.advanceTimersByTimeAsync(29 * MINUTE);
        expect(fetchManifest).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(MINUTE);
        expect(fetchManifest).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(30 * MINUTE);
        expect(fetchManifest).toHaveBeenCalledTimes(2);
        expect(monitor.getAvailableRelease()).toBeNull();
    });

    it('keeps a minimum gap between checks however often the window is focused', async () => {
        const {fetchManifest, focus} = setup(() => manifestResponse('0.2.0'));

        await focus();
        await focus();
        await vi.advanceTimersByTimeAsync(10_000);
        await focus();
        expect(fetchManifest).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(MINUTE);
        await focus();
        expect(fetchManifest).toHaveBeenCalledTimes(2);
    });

    it('does not start a second check while one is still waiting for the network', async () => {
        let answer: (response: Response) => void = () => {};
        const {
            monitor,
            fetchManifest,
            focus,
        } = setup(() => new Response());

        fetchManifest.mockImplementation(() => new Promise<Response>(resolve => {
            answer = resolve;
        }));

        await focus();
        await vi.advanceTimersByTimeAsync(5 * MINUTE);
        await focus();
        expect(fetchManifest).toHaveBeenCalledTimes(1);

        answer(manifestResponse('0.3.0'));
        await vi.advanceTimersByTimeAsync(0);
        expect(monitor.getAvailableRelease()).toBe('0.3.0');
    });

    it('follows the server to a still newer Release but never back to an older one', async () => {
        let release = '0.3.0';
        const {monitor, focus} = setup(() => manifestResponse(release));

        await focus();
        expect(monitor.getAvailableRelease()).toBe('0.3.0');

        release = '0.4.0';
        await vi.advanceTimersByTimeAsync(2 * MINUTE);
        await focus();
        expect(monitor.getAvailableRelease()).toBe('0.4.0');

        release = '0.3.0';
        await vi.advanceTimersByTimeAsync(2 * MINUTE);
        await focus();
        expect(monitor.getAvailableRelease()).toBe('0.4.0');
    });

    it('stops listening and polling once stopped', async () => {
        const {
            fetchManifest,
            focus,
            stop,
        } = setup(() => manifestResponse('0.3.0'));

        stop();
        await focus();
        await vi.advanceTimersByTimeAsync(31 * MINUTE);

        expect(fetchManifest).not.toHaveBeenCalled();
    });
});
