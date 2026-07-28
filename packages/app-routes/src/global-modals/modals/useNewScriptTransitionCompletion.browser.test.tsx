import {createRoot, type Root} from 'react-dom/client';
import {
    MemoryRouter,
    useNavigate,
} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {useNewScriptTransitionCompletion} from './useNewScriptTransitionCompletion';

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
});

describe('useNewScriptTransitionCompletion', () => {
    it('completes only after the router reaches the target pathname', async () => {
        const targetPath = '/script/script-1/editor';
        const onComplete = vi.fn();
        const Harness = () => {
            const navigate = useNavigate();

            useNewScriptTransitionCompletion({
                targetPath,
                onComplete,
            });

            return (
                <button type="button" onClick={() => void navigate(targetPath)}>
                    Navigate
                </button>
            );
        };
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(
            <MemoryRouter initialEntries={['/']}>
                <Harness />
            </MemoryRouter>,
        );
        mountedRoots.push(root);
        await waitFor(() => document.querySelector('button') !== null);

        expect(onComplete).not.toHaveBeenCalled();

        await page.elementLocator(document.querySelector('button')!).click();
        await waitFor(() => onComplete.mock.calls.length === 1);

        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
