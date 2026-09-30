import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {useAttributeManagerModalState} from './useAttributeManagerModalState';

const mountedRoots: Root[] = [];

const StateHarness = () => {
    const state = useAttributeManagerModalState();

    return (
        <div
            data-open={state.isOpen}
            data-panel={state.activePanelId}
            data-workspace={state.initialWorkspaceId}
            data-group={state.selectedGroupId ?? ''}
        >
            <button type="button" onClick={() => state.openGroup('group-1')}>
                Open group
            </button>
            <button type="button" onClick={() => state.openMusic('music-1')}>
                Open music
            </button>
            <button type="button" onClick={() => state.selectPanel('music')}>
                Select music panel
            </button>
            <button type="button" onClick={() => state.selectPanel('characters')}>
                Select characters panel
            </button>
        </div>
    );
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('useAttributeManagerModalState group navigation', () => {
    it('opens the selected group in the character manager Groups workspace', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<StateHarness />);
        mountedRoots.push(root);

        await page.getByRole('button', {name: 'Open group'}).click();

        expect(host.firstElementChild?.getAttribute('data-open')).toBe('true');
        expect(host.firstElementChild?.getAttribute('data-panel')).toBe('characters');
        expect(host.firstElementChild?.getAttribute('data-workspace')).toBe('groups');
        expect(host.firstElementChild?.getAttribute('data-group')).toBe('group-1');
    });

    it('does not retain group workspace selection for direct music navigation', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<StateHarness />);
        mountedRoots.push(root);

        await page.getByRole('button', {name: 'Open group'}).click();
        await page.getByRole('button', {name: 'Open music'}).click();

        expect(host.firstElementChild?.getAttribute('data-workspace')).toBe('characters');
        expect(host.firstElementChild?.getAttribute('data-group')).toBe('');
    });

    it('clears group selection when generic tab navigation leaves Characters', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<StateHarness />);
        mountedRoots.push(root);

        await page.getByRole('button', {name: 'Open group'}).click();
        await page.getByRole('button', {name: 'Select music panel'}).click();
        await page.getByRole('button', {name: 'Select characters panel'}).click();

        expect(host.firstElementChild?.getAttribute('data-panel')).toBe('characters');
        expect(host.firstElementChild?.getAttribute('data-workspace')).toBe('characters');
        expect(host.firstElementChild?.getAttribute('data-group')).toBe('');
    });
});
