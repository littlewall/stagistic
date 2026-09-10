import {createRoot, type Root} from 'react-dom/client';
import {
    MemoryRouter, Route, Routes,
} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {ScriptSettingsRoute} from './ScriptSettingsRoute';

vi.mock('@stagistic/app-core', async importOriginal => {
    const original = await importOriginal<typeof import('@stagistic/app-core')>();

    return {
        ...original,
        useScripts: () => ({
            scripts: [],
            isLoading: true,
        }),
    };
});

const mountedRoots: Root[] = [];

const renderRoute = () => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <MemoryRouter initialEntries={['/script/s1/settings']}>
            <Routes>
                <Route path="/script/:scriptId/settings" element={<ScriptSettingsRoute />} />
            </Routes>
        </MemoryRouter>,
    );
    mountedRoots.push(root);

    return host;
};

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

describe('ScriptSettingsRoute', () => {
    it('shows a loader instead of a blank page while scripts are loading', async () => {
        const host = renderRoute();

        await waitFor(() => host.querySelector('[role="status"]') !== null);

        expect(host.querySelector('[role="status"]')).not.toBeNull();
        expect(host.textContent).not.toBe('');
    });
});
