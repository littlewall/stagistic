import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {BootFailureScreen} from './BootFailureScreen';

const roots: Root[] = [];

const mount = (element: React.ReactElement) => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(element);

    return container;
};

const findButton = (container: HTMLElement, label: string) => [...container.querySelectorAll('button')].find(button => button.textContent === label);

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

describe('boot failure screen', () => {
    it('says an older version is running and does not offer a reload', async () => {
        const container = mount(<BootFailureScreen surface="web" failure={{kind: 'older-version-running', message: ''}} />);

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
            'An older version of Stagistic is running',
        );
        expect(container.textContent).toContain('Close it');
        expect(container.textContent).toContain('Tabs of this Release can stay open');
        expect(container.textContent).not.toMatch(/one tab|single tab|only works/i);
        expect(container.querySelector('button')).toBeNull();
    });

    it('offers a reload when the database is newer than the app', async () => {
        const onReload = vi.fn();
        const container = mount(
            <BootFailureScreen
                surface="web"
                failure={{kind: 'database-newer-than-app', message: 'Database migration 9999_x is newer than this app.'}}
                onReload={onReload}
            />,
        );

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
            'Your scripts need a newer Release of Stagistic',
        );
        findButton(container, 'Reload')?.click();
        expect(onReload).toHaveBeenCalledTimes(1);
    });

    it('explains a failed migration, shows its id and renders the extra actions', async () => {
        const container = mount(
            <BootFailureScreen
                surface="web"
                failure={{
                    kind: 'migration-failed',
                    message: 'Migration 0042_x failed.',
                    migrationId: '0042_x',
                }}
                actions={<button type="button">Download backup</button>}
            />,
        );

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
            'Stagistic could not update your database',
        );
        expect(container.textContent).toContain('0042_x');
        expect(findButton(container, 'Download backup')).toBeDefined();
    });

    it('falls back to a generic message with technical details', async () => {
        const container = mount(<BootFailureScreen surface="web" failure={{kind: 'unknown', message: 'Worker blew up'}} />);

        await expect.poll(() => container.querySelector('h1')?.textContent).toBe('Stagistic could not start');
        expect(container.querySelector('pre')?.textContent).toBe('Worker blew up');
        expect(findButton(container, 'Reload')).toBeDefined();
    });
    describe('on the Mac app', () => {
        it('asks to download the current Release and gives no reload or tab advice', async () => {
            const onOpenDownloadPage = vi.fn();
            const container = mount(
                <BootFailureScreen
                    surface="desktop"
                    failure={{kind: 'database-newer-than-app', message: ''}}
                    onOpenDownloadPage={onOpenDownloadPage}
                />,
            );

            await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
                'Your scripts need a newer Release of Stagistic',
            );
            expect(container.textContent).toContain('https://stagistic.com/download');
            expect(container.textContent).not.toMatch(/reload|tab/i);
            expect(findButton(container, 'Reload')).toBeUndefined();
            findButton(container, 'Open download page')?.click();
            expect(onOpenDownloadPage).toHaveBeenCalledTimes(1);
        });

        it('names the backups folder after a failed migration and shows it on request', async () => {
            const onShowBackupsFolder = vi.fn();
            const container = mount(
                <BootFailureScreen
                    surface="desktop"
                    failure={{
                        kind: 'migration-failed',
                        message: 'boom',
                        migrationId: '2026_x',
                    }}
                    onShowBackupsFolder={onShowBackupsFolder}
                />,
            );

            await expect.poll(() => container.querySelector('h1')?.textContent).toBe(
                'Stagistic could not update your scripts',
            );
            expect(container.textContent).toContain('backups folder');
            expect(container.textContent).not.toMatch(/reload|tab|device/i);
            findButton(container, 'Show Backups Folder')?.click();
            expect(onShowBackupsFolder).toHaveBeenCalledTimes(1);
        });

        it('has no tab wording when an older version is running', async () => {
            const container = mount(
                <BootFailureScreen surface="desktop" failure={{kind: 'older-version-running', message: ''}} />,
            );

            await expect.poll(() => container.querySelector('h1')?.textContent).toContain('older version');
            expect(container.textContent).not.toMatch(/tab|reload/i);
        });
    });
});
