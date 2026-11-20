import '@stagistic/ui/styles/tokens.css';

import {dismissRuntimeFileFailure, reportRuntimeFileFailure} from '@stagistic/app-core';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {RuntimeFileFailurePrompt} from './RuntimeFileFailurePrompt';

let root: Root | null = null;

const mount = () => {
    const reload = vi.fn();
    const host = document.body.appendChild(document.createElement('div'));

    root = createRoot(host);
    root.render(<RuntimeFileFailurePrompt reload={reload} />);

    return {reload};
};

const prompt = () => document.querySelector<HTMLDialogElement>('dialog[open]');
const button = (label: string) => [...document.querySelectorAll('button')].find(item => item.textContent === label);
const settle = () => new Promise(resolve => window.setTimeout(resolve, 40));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
    dismissRuntimeFileFailure();
});

describe('RuntimeFileFailurePrompt', () => {
    it('stays out of the way until a runtime file fails', async () => {
        mount();
        await settle();

        expect(prompt()).toBeNull();
    });

    it('offers a reload and says what failed, without reloading by itself', async () => {
        const {reload} = mount();

        await settle();
        reportRuntimeFileFailure('The preview of this Script Version could not start.');
        await settle();

        expect(prompt()?.textContent).toContain('The preview of this Script Version could not start.');
        expect(prompt()?.textContent).toContain('Nothing is reloaded until you choose.');
        expect(reload).not.toHaveBeenCalled();

        button('Reload')?.click();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('can be set aside, and a later failure asks again', async () => {
        mount();
        await settle();
        reportRuntimeFileFailure('First.');
        await settle();

        button('Not now')?.click();
        await settle();
        expect(prompt()).toBeNull();

        reportRuntimeFileFailure('Second.');
        await settle();
        expect(prompt()?.textContent).toContain('Second.');
    });

    it('reacts to a chunk that failed to preload', async () => {
        mount();
        await settle();

        window.dispatchEvent(new Event('vite:preloadError', {cancelable: true}));
        await settle();

        expect(prompt()).not.toBeNull();
    });

    it('reacts to a dynamic import that nobody caught', async () => {
        mount();
        await settle();

        const reason = new TypeError('Failed to fetch dynamically imported module: /assets/gone-1a2b.js');
        const rejected = Promise.reject(reason);

        rejected.catch(() => {});
        window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {promise: rejected, reason}));
        await settle();

        expect(prompt()).not.toBeNull();
    });

    it('ignores other unhandled rejections', async () => {
        mount();
        await settle();

        const reason = new Error('something else');
        const rejected = Promise.reject(reason);

        rejected.catch(() => {});
        window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {promise: rejected, reason}));
        await settle();

        expect(prompt()).toBeNull();
    });
});
