import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useSceneDeletionState} from './useSceneDeletionState';

const roots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for scene-deletion state');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = () => {
    const {
        pendingSceneDelete,
        deleteSceneRequest,
        requestDeleteScene,
        closeSceneDeleteModal,
        confirmDeleteScene,
    } = useSceneDeletionState();

    return (
        <div>
            <output data-testid="pending">{pendingSceneDelete?.blockId ?? ''}</output>
            <output data-testid="request">
                {deleteSceneRequest ? `${deleteSceneRequest.sceneHeadingBlockId}:${deleteSceneRequest.requestId}` : ''}
            </output>
            <button
                type="button"
                data-testid="request-s2"
                onClick={() => requestDeleteScene('s2')}
            >Request s2
            </button>
            <button
                type="button"
                data-testid="request-s3"
                onClick={() => requestDeleteScene('s3')}
            >Request s3
            </button>
            <button
                type="button"
                data-testid="confirm"
                onClick={confirmDeleteScene}
            >Confirm
            </button>
            <button
                type="button"
                data-testid="close"
                onClick={closeSceneDeleteModal}
            >Close
            </button>
        </div>
    );
};

const mount = async () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    roots.push(root);
    root.render(<Harness />);

    await waitFor(() => host.querySelector('[data-testid="confirm"]') !== null);

    return {
        pending: () => host.querySelector('[data-testid="pending"]')?.textContent ?? '',
        request: () => host.querySelector('[data-testid="request"]')?.textContent ?? '',
        click: (testId: string) => host.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click(),
    };
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useSceneDeletionState', () => {
    it('opens the pending modal on request and raises a request on confirm', async () => {
        const host = await mount();

        host.click('request-s2');
        await waitFor(() => host.pending() === 's2');
        expect(host.request()).toBe('');

        host.click('confirm');
        await waitFor(() => host.request() === 's2:1');
        // Confirming closes the modal.
        expect(host.pending()).toBe('');
    });

    it('cancelling clears the pending block without raising a request', async () => {
        const host = await mount();

        host.click('request-s2');
        await waitFor(() => host.pending() === 's2');

        host.click('close');
        await waitFor(() => host.pending() === '');
        expect(host.request()).toBe('');
    });

    it('gives each confirmed deletion a fresh incrementing requestId', async () => {
        const host = await mount();

        host.click('request-s2');
        await waitFor(() => host.pending() === 's2');
        host.click('confirm');
        await waitFor(() => host.request() === 's2:1');

        host.click('request-s3');
        await waitFor(() => host.pending() === 's3');
        host.click('confirm');
        await waitFor(() => host.request() === 's3:2');
    });

    it('confirming with nothing pending raises no request', async () => {
        const host = await mount();

        host.click('confirm');
        // Give React a tick to flush any (unexpected) state update.
        await new Promise(resolve => window.setTimeout(resolve, 20));
        expect(host.request()).toBe('');
        expect(host.pending()).toBe('');
    });
});
