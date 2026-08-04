import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

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

const setViewport = async (width: number) => {
    await page.viewport(width, 800);
    await new Promise(resolve => window.setTimeout(resolve, 150));
};

afterEach(async () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
    await setViewport(1280);
});

describe('UnsupportedScreenGate', () => {
    it('shows the notice below 1000px and the editor at or above', async () => {
        const {UnsupportedScreenGate, MIN_SUPPORTED_WIDTH} = await import(
            './UnsupportedScreenGate'
        );

        expect(MIN_SUPPORTED_WIDTH).toBe(1000);

        await setViewport(800);
        expect(window.innerWidth).toBeLessThan(1000);

        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <UnsupportedScreenGate>
                <div>editor content</div>
            </UnsupportedScreenGate>,
        );
        mountedRoots.push(root);

        await waitFor(() => host.querySelector('[role="alert"]') !== null);

        const notice = host.querySelector<HTMLElement>('[role="alert"]');

        expect(notice?.textContent).toContain('larger screens');
        expect(host.textContent).not.toContain('editor content');

        await setViewport(1280);
        await waitFor(() => host.querySelector('[role="alert"]') === null);

        expect(host.textContent).toContain('editor content');
    });
});
