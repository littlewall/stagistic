import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    dismissRuntimeFileFailure,
    getRuntimeFileFailure,
    guardRuntimeFile,
    isDynamicImportFailure,
    reportDynamicImportFailure,
    reportRuntimeFileFailure,
    subscribeRuntimeFileFailure,
} from './runtimeFileFailure';

afterEach(() => {
    dismissRuntimeFileFailure();
    vi.useRealTimers();
});

describe('runtime file failure', () => {
    it('keeps the first report and tells subscribers once', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeRuntimeFileFailure(listener);

        reportRuntimeFileFailure('The preview worker could not be loaded.');
        reportRuntimeFileFailure('Another file failed.');

        expect(getRuntimeFileFailure()).toBe('The preview worker could not be loaded.');
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();
    });

    it('can be dismissed, and a later failure is reported again', () => {
        reportRuntimeFileFailure('first');
        dismissRuntimeFileFailure();
        expect(getRuntimeFileFailure()).toBeNull();

        reportRuntimeFileFailure('second');
        expect(getRuntimeFileFailure()).toBe('second');
    });

    it('reports and rethrows when the guarded work fails', async () => {
        const error = new Error('worker 404');

        await expect(guardRuntimeFile(Promise.reject(error), {description: 'The preview could not start.', timeoutMs: 1000})).rejects.toBe(error);
        expect(getRuntimeFileFailure()).toBe('The preview could not start.');
    });

    it('passes a result through without reporting', async () => {
        await expect(guardRuntimeFile(Promise.resolve(7), {description: 'x', timeoutMs: 1000})).resolves.toBe(7);
        expect(getRuntimeFileFailure()).toBeNull();
    });

    it('reports and rejects when the work never answers', async () => {
        vi.useFakeTimers();

        const result = guardRuntimeFile(new Promise<never>(() => {}), {description: 'The preview could not start.', timeoutMs: 5000});
        const assertion = expect(result).rejects.toThrow('did not answer');

        await vi.advanceTimersByTimeAsync(5000);
        await assertion;
        expect(getRuntimeFileFailure()).toBe('The preview could not start.');
    });

    it('does not report a late result as a failure', async () => {
        vi.useFakeTimers();

        const result = guardRuntimeFile(new Promise<string>(resolve => setTimeout(() => resolve('late'), 100)), {description: 'x', timeoutMs: 5000});

        await vi.advanceTimersByTimeAsync(100);
        await expect(result).resolves.toBe('late');
        await vi.advanceTimersByTimeAsync(5000);
        expect(getRuntimeFileFailure()).toBeNull();
    });
});

describe('dynamic import failures', () => {
    it.each([
        'Failed to fetch dynamically imported module: https://editor.stagistic.app/assets/x-1a2b.js',
        'error loading dynamically imported module: https://editor.stagistic.app/assets/x-1a2b.js',
        'Importing a module script failed.',
    ])('recognises "%s"', message => {
        expect(isDynamicImportFailure(new TypeError(message))).toBe(true);
    });

    it('recognises the pdfjs fake-worker failure, a plain Error', () => {
        expect(isDynamicImportFailure(new Error('Setting up fake worker failed: "Failed to fetch dynamically imported module: /assets/pdf.worker-1a.mjs".'))).toBe(true);
        expect(isDynamicImportFailure(new Error('Invalid PDF structure.'))).toBe(false);
    });

    it('does not mistake other errors for a missing file', () => {
        expect(isDynamicImportFailure(new TypeError('x is not a function'))).toBe(false);
        expect(isDynamicImportFailure('Importing a module script failed.')).toBe(false);
        expect(isDynamicImportFailure(null)).toBe(false);
    });

    it('reports only a dynamic import failure', () => {
        reportDynamicImportFailure(new Error('boom'), 'a');
        expect(getRuntimeFileFailure()).toBeNull();

        reportDynamicImportFailure(new TypeError('Failed to fetch dynamically imported module: /a.js'), 'b');
        expect(getRuntimeFileFailure()).toBe('b');
    });
});
