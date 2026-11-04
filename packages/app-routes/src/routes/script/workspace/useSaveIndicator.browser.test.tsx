import {requireValue} from '@stagistic/shared';
import {useLayoutEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useSaveIndicator} from './useSaveIndicator';

let root: Root | null = null;
let latest: ReturnType<typeof useSaveIndicator> | null = null;

const waitForState = async (expected: string, timeoutMs = 2500) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const state = document.querySelector('[data-save-indicator-state]')?.textContent;

        if (state === expected) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected save indicator state ${expected}`);
};

const blockMainThread = (durationMs: number) => {
    const deadline = performance.now() + durationMs;
    let iterations = 0;

    while (performance.now() < deadline) {
        iterations += 1;
    }

    return iterations;
};

const SaveIndicatorHarness = () => {
    const indicator = useSaveIndicator();
    const {
        saveIndicator,
        startSaveIndicator,
        finishSaveIndicator,
    } = indicator;

    useLayoutEffect(() => {
        latest = indicator;
    }, [indicator]);

    return (
        <div>
            <output data-save-indicator-state>{saveIndicator}</output>
            <button type="button" onClick={startSaveIndicator}>Start</button>
            <button
                type="button"
                onClick={() => {
                    finishSaveIndicator(true);
                    blockMainThread(1400);
                }}
            >
                Succeed under load
            </button>
            <button type="button" onClick={() => finishSaveIndicator(false)}>Fail</button>
        </div>
    );
};

const mountHarness = () => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<SaveIndicatorHarness />);
};

afterEach(() => {
    root?.unmount();
    root = null;
    latest = null;
    document.body.innerHTML = '';
});

describe('useSaveIndicator', () => {
    it('shows slow saving and a full success confirmation after a delayed render', async () => {
        mountHarness();

        await waitForState('idle');
        await userEvent.click(requireValue(document.querySelector('button')));
        await waitForState('saving');
        await userEvent.click(document.querySelectorAll('button')[1]);
        await waitForState('saved');
        await waitForState('idle');
    });

    it('keeps a failed save visible', async () => {
        mountHarness();

        await waitForState('idle');
        await userEvent.click(requireValue(document.querySelector('button')));
        await userEvent.click(document.querySelectorAll('button')[2]);
        await waitForState('error');
        await new Promise(resolve => window.setTimeout(resolve, 1500));

        expect(document.querySelector('[data-save-indicator-state]')?.textContent).toBe('error');
    });

    it('keeps a failure visible when another overlapping save succeeds', async () => {
        mountHarness();
        await waitForState('idle');

        const controls = requireValue(latest);

        controls.startSaveIndicator();
        controls.startSaveIndicator();
        controls.finishSaveIndicator(false);
        controls.finishSaveIndicator(true);
        await waitForState('error');
    });

    it('tracks a metadata promise alongside an existing document save', async () => {
        mountHarness();
        await waitForState('idle');

        const controls = requireValue(latest);
        let resolve!: (value: string) => void;
        const persistence = new Promise<string>(fulfill => {
            resolve = fulfill;
        });

        controls.startSaveIndicator();

        const tracked = controls.trackSave(() => persistence);

        controls.finishSaveIndicator(true);
        await waitForState('saving');
        resolve('persisted');
        await expect(tracked).resolves.toBe('persisted');
        await waitForState('saved');
    });

    it('propagates a metadata failure and lets a later retry recover', async () => {
        mountHarness();
        await waitForState('idle');

        const controls = requireValue(latest);

        await expect(controls.trackSave(() => Promise.reject(new Error('disk full')))).rejects.toThrow('disk full');
        await waitForState('error');
        await expect(controls.trackSave(() => Promise.resolve('retried'))).resolves.toBe('retried');
        await waitForState('saved');
    });
});
