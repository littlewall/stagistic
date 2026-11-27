import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {MacUpdatesSettingsPanel, type MacUpdateStatus} from './MacUpdatesSettingsPanel';

const roots: Root[] = [];

const mount = (status: MacUpdateStatus) => {
    const actions = {
        onCheckNow: vi.fn(),
        onRestart: vi.fn(),
        onOpenWhatsNew: vi.fn(),
        onOpenChangelog: vi.fn(),
    };
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(<MacUpdatesSettingsPanel currentRelease="1.0.0" status={status} {...actions} />);

    return {container, ...actions};
};

const button = (container: HTMLElement, label: string) => [...container.querySelectorAll('button')].find(candidate => candidate.textContent === label);

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

describe('Mac updates settings panel', () => {
    it('shows the Version with What\'s new and Full changelog', async () => {
        const {container, onOpenChangelog} = mount({status: 'idle'});

        await expect.poll(() => container.textContent).toContain('Stagistic Editor');
        expect(container.textContent).toContain('Version');
        expect(container.textContent).not.toContain('Release notes');
        button(container, 'Full changelog')?.click();
        expect(onOpenChangelog).toHaveBeenCalledWith('https://stagistic.com/changelog');
    });

    it('shows the current Release and when it was last checked', async () => {
        const {container} = mount({status: 'up-to-date', checkedAt: new Date(2026, 10, 24, 10, 42)});

        await expect.poll(() => container.textContent).toContain('Release 1.0.0');
        expect(container.textContent).toMatch(/Up to date · checked \d{1,2}:42/);
    });

    it('shows a status line for each state', async () => {
        const downloading = mount({status: 'downloading', release: '1.0.1'});

        await expect.poll(() => downloading.container.textContent).toContain('Downloading the new version…');
        expect(button(downloading.container, 'Check now')?.disabled).toBe(true);

        const checking = mount({status: 'checking'});

        await expect.poll(() => checking.container.textContent).toContain('Checking for updates…');

        const failed = mount({status: 'failed'});

        await expect.poll(() => failed.container.textContent).toContain('Couldn\'t check for updates');
        expect(button(failed.container, 'Try again')).toBeDefined();
        expect(button(failed.container, 'Check now')).toBeUndefined();
    });

    it('offers Restart, never automatically, when a Release is ready', async () => {
        const {container, onRestart} = mount({status: 'ready', release: '1.0.1'});

        await expect.poll(() => container.textContent).toContain('New version is ready');
        expect(onRestart).not.toHaveBeenCalled();
        button(container, 'Restart')?.click();
        expect(onRestart).toHaveBeenCalledTimes(1);
    });

    it('checks now, retries and opens What\'s new', async () => {
        const idle = mount({status: 'idle'});

        await expect.poll(() => button(idle.container, 'Check now')).toBeDefined();
        button(idle.container, 'Check now')?.click();
        expect(idle.onCheckNow).toHaveBeenCalledTimes(1);
        button(idle.container, 'What\'s new')?.click();
        expect(idle.onOpenWhatsNew).toHaveBeenCalledTimes(1);

        const failed = mount({status: 'failed'});

        await expect.poll(() => button(failed.container, 'Try again')).toBeDefined();
        button(failed.container, 'Try again')?.click();
        expect(failed.onCheckNow).toHaveBeenCalledTimes(1);
    });
});
