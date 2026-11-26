import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {MacStorageSettingsPanel} from './MacStorageSettingsPanel';

const roots: Root[] = [];

const mount = (element: React.ReactElement) => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);

    roots.push(root);
    root.render(element);

    return container;
};

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    document.body.innerHTML = '';
});

const info = {
    attachmentsPath: '/Users/x/Library/Application Support/app/attachments',
    backupsPath: '/Users/x/Library/Application Support/app/backups',
};

describe('Mac storage settings panel', () => {
    it('shows where scripts, attachments and backups live', async () => {
        const container = mount(<MacStorageSettingsPanel info={info} onShowBackupsFolder={() => {}} />);

        await expect.poll(() => container.textContent).toContain(info.backupsPath);
        expect(container.textContent).toContain(info.attachmentsPath);
        expect(container.textContent).toContain('Your data is stored locally on this Mac.');
        expect(container.textContent).not.toMatch(/browser|tab/i);
    });

    it('says when there is no backup yet', async () => {
        const container = mount(
            <MacStorageSettingsPanel info={info} backups={[]} onShowBackupsFolder={() => {}} />,
        );

        await expect.poll(() => container.textContent).toContain('No backup yet.');
    });

    it('runs the action from Show Attachments Folder', async () => {
        const onShowAttachmentsFolder = vi.fn();
        const container = mount(
            <MacStorageSettingsPanel info={info} onShowAttachmentsFolder={onShowAttachmentsFolder} onShowBackupsFolder={() => {}} />,
        );

        await expect.poll(() => container.querySelector('button')).not.toBeNull();
        [...container.querySelectorAll('button')].find(candidate => candidate.textContent === 'Show Attachments Folder')?.click();
        expect(onShowAttachmentsFolder).toHaveBeenCalledTimes(1);
    });

    it('runs the action from Show Backups Folder', async () => {
        const onShowBackupsFolder = vi.fn();
        const container = mount(<MacStorageSettingsPanel info={info} onShowBackupsFolder={onShowBackupsFolder} />);

        await expect.poll(() => container.querySelector('button')).not.toBeNull();
        container.querySelector('button')?.click();
        expect(onShowBackupsFolder).toHaveBeenCalledTimes(1);
    });

    describe('backups', () => {
        const backups = [
            {
                name: 'stagistic-20261125-100000.pgdata.gz',
                time: new Date(2026, 10, 25, 10, 0),
                kind: 'periodic' as const,
            },
            {
                name: 'stagistic-premigration-20261124-090000.pgdata.gz',
                time: new Date(2026, 10, 24, 9, 0),
                kind: 'premigration' as const,
            },
        ];
        const buttonByText = (container: ParentNode, text: string) => [...container.querySelectorAll('button')].find(button => button.textContent?.trim() === text);

        it('lists backups newest first with Before update for the pre-migration one', async () => {
            const container = mount(
                <MacStorageSettingsPanel info={info} backups={backups} onShowBackupsFolder={() => {}} onRestoreBackup={() => Promise.resolve({ok: true})} />,
            );

            await expect.poll(() => container.querySelectorAll('[aria-label="Backups"] li').length).toBe(2);

            const rows = [...container.querySelectorAll('[aria-label="Backups"] li')].map(row => row.textContent);

            expect(rows[0]).toContain('Nov 25, 2026');
            expect(rows[0]).not.toContain('Before update');
            expect(rows[1]).toContain('Before update');
            expect(container.querySelectorAll('[aria-label="Backups"] li button')).toHaveLength(2);
        });

        it('asks for confirmation that names the backup, then restores it', async () => {
            const onRestoreBackup = vi.fn(() => Promise.resolve({ok: true as const}));
            const container = mount(
                <MacStorageSettingsPanel info={info} backups={backups} onShowBackupsFolder={() => {}} onRestoreBackup={onRestoreBackup} />,
            );

            await expect.poll(() => buttonByText(container, 'Restore…')).toBeDefined();
            buttonByText(container, 'Restore…')?.click();

            await expect.poll(() => document.body.textContent).toContain('Restore the backup from Nov 25, 2026');
            expect(document.body.textContent).toContain('replaced by the ones in this backup');
            expect(document.body.textContent).toContain('backed up before anything changes');
            expect(document.body.textContent).toContain('Attachments are not part of backups');
            expect(onRestoreBackup).not.toHaveBeenCalled();

            const dialog = document.querySelector('dialog[open]') as HTMLElement;

            expect(buttonByText(dialog, 'Cancel')).toBeDefined();
            buttonByText(dialog, 'Restore')?.click();

            await expect.poll(() => onRestoreBackup).toHaveBeenCalledWith(backups[0]);
        });

        it('restores a backup file picked with Restore from File…', async () => {
            const picked = {
                name: 'my-backup.pgdata.gz',
                kind: 'file' as const,
                fileName: 'my-backup.pgdata.gz',
                time: new Date(2026, 10, 20, 8, 0),
            };
            const onRestoreBackup = vi.fn(() => Promise.resolve({ok: true as const}));
            const container = mount(
                <MacStorageSettingsPanel
                    info={info}
                    backups={backups}
                    onShowBackupsFolder={() => {}}
                    onRestoreBackup={onRestoreBackup}
                    onChooseBackupFile={() => Promise.resolve(picked)}
                />,
            );

            await expect.poll(() => buttonByText(container, 'Restore from File…')).toBeDefined();
            buttonByText(container, 'Restore from File…')?.click();

            await expect.poll(() => document.body.textContent).toContain('Restore the backup my-backup.pgdata.gz from Nov 20, 2026');
            buttonByText(document.querySelector('dialog[open]') as HTMLElement, 'Restore')?.click();

            await expect.poll(() => onRestoreBackup).toHaveBeenCalledWith(picked);
        });

        it('drops a picked file when its confirmation is cancelled, and does nothing when picking is cancelled', async () => {
            const onDiscardBackupFile = vi.fn();
            const onChooseBackupFile = vi.fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    name: 'my-backup.pgdata.gz',
                    kind: 'file' as const,
                    fileName: 'my-backup.pgdata.gz',
                    time: new Date(2026, 10, 20, 8, 0),
                });
            const container = mount(
                <MacStorageSettingsPanel
                    info={info}
                    backups={backups}
                    onShowBackupsFolder={() => {}}
                    onRestoreBackup={() => Promise.resolve({ok: true})}
                    onChooseBackupFile={onChooseBackupFile}
                    onDiscardBackupFile={onDiscardBackupFile}
                />,
            );

            await expect.poll(() => buttonByText(container, 'Restore from File…')).toBeDefined();
            buttonByText(container, 'Restore from File…')?.click();
            await expect.poll(() => onChooseBackupFile).toHaveBeenCalledTimes(1);
            expect(document.querySelector('dialog[open]')).toBeNull();

            buttonByText(container, 'Restore from File…')?.click();
            await expect.poll(() => document.querySelector('dialog[open]')).not.toBeNull();
            buttonByText(document.querySelector('dialog[open]') as HTMLElement, 'Cancel')?.click();

            await expect.poll(() => onDiscardBackupFile).toHaveBeenCalledTimes(1);
        });

        it('shows a failure in the dialog and lets the writer cancel', async () => {
            const onRestoreBackup = vi.fn(() => Promise.resolve({ok: false as const, message: 'The backup could not be prepared.'}));
            const container = mount(
                <MacStorageSettingsPanel info={info} backups={backups} onShowBackupsFolder={() => {}} onRestoreBackup={onRestoreBackup} />,
            );

            await expect.poll(() => buttonByText(container, 'Restore…')).toBeDefined();
            buttonByText(container, 'Restore…')?.click();
            await expect.poll(() => document.querySelector('dialog[open]')).not.toBeNull();

            const dialog = document.querySelector('dialog[open]') as HTMLElement;

            buttonByText(dialog, 'Restore')?.click();
            await expect.poll(() => document.body.textContent).toContain('The backup could not be prepared.');

            buttonByText(dialog, 'Cancel')?.click();
            await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
        });
    });
});

