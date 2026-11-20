import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {BootFailureScreen} from './BootFailureScreen';
import {PremigrationBackupAction} from './PremigrationBackupAction';

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
    vi.restoreAllMocks();
});

const backup = {
    fileName: 'stagistic-before-update-20261105T120309Z.pgdata.tar.gz',
    createdAt: Date.UTC(2026, 10, 5, 12, 3, 9),
    blob: new Blob(['dump'], {type: 'application/gzip'}),
};

describe('pre-migration backup action', () => {
    it('downloads the stored file when asked', async () => {
        const container = mount(<PremigrationBackupAction loadBackup={() => Promise.resolve(backup)} />);

        await expect.poll(() => findButton(container, 'Download backup')).toBeDefined();

        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
        const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        const downloads: {name: string, href: string}[] = [];

        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
            downloads.push({name: this.download, href: this.href});
        });
        findButton(container, 'Download backup')?.click();

        expect(createObjectURL).toHaveBeenCalledWith(backup.blob);
        expect(downloads).toEqual([{name: backup.fileName, href: 'blob:backup'}]);
        await expect.poll(() => revokeObjectURL).toHaveBeenCalledWith('blob:backup');
    });

    it('says in plain words what the copy is, when it was taken and that the app cannot open it yet', async () => {
        const container = mount(<PremigrationBackupAction loadBackup={() => Promise.resolve(backup)} />);

        await expect.poll(() => container.textContent).toContain('2026');
        expect(container.textContent).toMatch(/copy of your scripts from .*2026.*taken before the update/i);
        expect(container.textContent).toMatch(/keep the file safe/i);
        expect(container.textContent).toMatch(/cannot open it yet/i);
        expect(container.querySelector<HTMLAnchorElement>('a[href="https://feedback.stagistic.com"]')?.textContent).toBe('feedback link');
        // Nothing a writer cannot act on.
        expect(container.textContent).not.toMatch(/pglite|data directory|developer|pgdata|tar\.gz/i);
    });

    it('says plainly that no backup exists, instead of offering a download', async () => {
        const container = mount(<PremigrationBackupAction loadBackup={() => Promise.resolve(null)} />);

        await expect.poll(() => container.textContent).toMatch(/no backup/i);
        expect(findButton(container, 'Download backup')).toBeUndefined();
    });

    it('treats an unreadable backup as none', async () => {
        const container = mount(<PremigrationBackupAction loadBackup={() => Promise.reject(new Error('blocked'))} />);

        await expect.poll(() => container.textContent).toMatch(/no backup/i);
        expect(findButton(container, 'Download backup')).toBeUndefined();
    });

    it('sits next to Reload on the failed migration screen', async () => {
        const container = mount(
            <BootFailureScreen
                failure={{
                    kind: 'migration-failed',
                    message: 'x',
                    migrationId: '0042_x',
                }}
                actions={<PremigrationBackupAction loadBackup={() => Promise.resolve(backup)} />}
            />,
        );

        await expect.poll(() => findButton(container, 'Download backup')).toBeDefined();
        expect(findButton(container, 'Reload')).toBeDefined();
    });
});
