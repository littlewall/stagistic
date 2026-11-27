import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {describeLogArgs, installFrontendErrorLog} from './frontendLog';

const setup = () => {
    const sent: string[] = [];
    const calls: unknown[][] = [];
    const target = new EventTarget();
    const fakeConsole = {
        error: (...args: unknown[]) => {
            calls.push(args);
        },
    };
    const uninstall = installFrontendErrorLog({
        console: fakeConsole,
        target,
        send: message => {
            sent.push(message);
        },
    });

    return {
        sent,
        calls,
        target,
        fakeConsole,
        uninstall,
    };
};

describe('frontend error log', () => {
    it('describes strings, errors and other values without dumping objects', () => {
        expect(describeLogArgs([
            'Backup failed',
            new TypeError('boom'),
            {text: 'INT. HOUSE'},
            4,
        ])).toBe('Backup failed TypeError: boom [object] [number]');
    });

    it('truncates long messages', () => {
        expect(describeLogArgs(['x'.repeat(2000)]).length).toBeLessThanOrEqual(501);
    });

    it('sends console.error and still calls the original', () => {
        const {
            sent,
            calls,
            fakeConsole,
        } = setup();

        fakeConsole.error('Backup snapshot failed', new Error('disk'));
        expect(sent).toEqual(['Backup snapshot failed Error: disk']);
        expect(calls).toHaveLength(1);
    });

    it('sends unhandled errors and rejections', () => {
        const {sent, target} = setup();

        target.dispatchEvent(Object.assign(new Event('error'), {message: 'Script error here'}));
        target.dispatchEvent(Object.assign(new Event('unhandledrejection'), {reason: new RangeError('deep')}));
        expect(sent).toEqual(['Unhandled error: Script error here', 'Unhandled rejection: RangeError: deep']);
    });

    it('never throws when sending fails', () => {
        const fakeConsole = {error: () => undefined};

        installFrontendErrorLog({
            console: fakeConsole,
            target: new EventTarget(),
            send: () => Promise.reject(new Error('ipc')),
        });
        expect(() => fakeConsole.error()).not.toThrow();
    });

    it('restores console.error on uninstall', () => {
        const {
            fakeConsole,
            sent,
            uninstall,
        } = setup();

        uninstall();
        fakeConsole.error('after');
        expect(sent).toEqual([]);
    });
});
