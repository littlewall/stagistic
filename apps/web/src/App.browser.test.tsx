import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

const STORAGE_KEY = 'stagistic.web.publicPreviewAcknowledgement';
const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
    window.localStorage.removeItem(STORAGE_KEY);
    vi.unstubAllGlobals();
});

describe('App', () => {
    it('starts the database worker only after public preview acknowledgement', async () => {
        const NativeWorker = window.Worker;
        let startedWorkerCount = 0;

        class TrackingWorker extends NativeWorker {
            constructor(scriptURL: string | URL, options?: WorkerOptions) {
                super(scriptURL, options);
                startedWorkerCount += 1;
            }
        }

        window.localStorage.removeItem(STORAGE_KEY);
        vi.stubGlobal('Worker', TrackingWorker);

        const {default: App} = await import('./App');
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<App />);
        mountedRoots.push(root);

        await waitFor(() => document.querySelector<HTMLDialogElement>('dialog')?.open === true);

        expect(startedWorkerCount).toBe(0);

        const continueButton = document.querySelector<HTMLButtonElement>('dialog button')!;

        await page.elementLocator(continueButton).click();
        await waitFor(() => startedWorkerCount === 1);

        expect(startedWorkerCount).toBe(1);
    });
});
