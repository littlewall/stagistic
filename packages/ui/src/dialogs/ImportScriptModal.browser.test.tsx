import '../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import type {StepkgPeekResult} from './importScript/types';
import {ImportScriptModal} from './ImportScriptModal';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const buildFileList = (file: File): FileList => {
    const transfer = new DataTransfer();

    transfer.items.add(file);

    return transfer.files;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const selectViaNativeInput = async (host: HTMLElement, file: File) => {
    await waitFor(() => host.querySelector('input[type="file"]') !== null);

    const input = host.querySelector<HTMLInputElement>('input[type="file"]');

    if (!input) throw new Error('Expected a native file input');

    Object.defineProperty(input, 'files', {value: buildFileList(file), configurable: true});
    input.dispatchEvent(new Event('change', {bubbles: true}));
};

describe('ImportScriptModal', () => {
    it('shows only the drop zone until a file is selected', () => {
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(
            <ImportScriptModal
                isOpen
                onClose={() => {}}
                onImportStagistic={() => Promise.resolve()}
                onImportStepkgAsNew={() => Promise.resolve()}
                onReplaceWithStepkg={() => Promise.resolve()}
                onDownloadStepkgBackup={() => Promise.resolve()}
                onPeekStepkg={() => Promise.resolve({ok: true, scriptId: 's', packageTitle: 'T', existingLocalTitle: null} satisfies StepkgPeekResult)}
            />,
        );
        mountedRoots.push(root);

        expect(host.querySelector('#import-script-name')).toBeNull();
    });

    it('reveals the New/Replace toggle and the replace panel on a .stepkg collision', async () => {
        const onPeekStepkg = () =>
            Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult);
        const onDownloadStepkgBackup = vi.fn(() => Promise.resolve());
        const onReplaceWithStepkg = vi.fn(() => Promise.resolve());
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(
            <ImportScriptModal
                isOpen
                onClose={() => {}}
                onImportStagistic={() => Promise.resolve()}
                onImportStepkgAsNew={() => Promise.resolve()}
                onReplaceWithStepkg={onReplaceWithStepkg}
                onDownloadStepkgBackup={onDownloadStepkgBackup}
                onPeekStepkg={onPeekStepkg}
            />,
        );
        mountedRoots.push(root);

        await selectViaNativeInput(host, new File(['zip-bytes'], 'play.stepkg'));
        await waitFor(() => host.textContent?.includes('Replace existing') ?? false);

        expect(host.textContent).toContain('play.stepkg');
        expect(host.textContent).toContain('(Drop or choose another file.)');

        const selectedFileHint = [...host.querySelectorAll('span')].find(element => element.textContent === '(Drop or choose another file.)');
        const nameInput = host.querySelector<HTMLInputElement>('#import-script-name');

        expect(selectedFileHint).toBeTruthy();
        expect(window.getComputedStyle(selectedFileHint!).fontSize).toBe('11px');
        expect(window.getComputedStyle(nameInput!).fontSize).toBe('12px');

        const replaceOption = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Replace existing'));

        expect(replaceOption).toBeTruthy();
        replaceOption?.click();

        await waitFor(() => host.textContent?.includes('Download backup') ?? false);
        expect(host.querySelector('#import-script-name')).toBeNull();
        expect(host.textContent).toContain('We recommend downloading a backup first.');

        const backupButton = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Download backup'));
        const warning = backupButton?.closest<HTMLElement>('[role="status"]');

        expect(warning).toBeTruthy();
        expect(window.getComputedStyle(warning!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(window.getComputedStyle(warning!).borderLeftStyle).toBe('solid');
        backupButton?.click();
        await waitFor(() => onDownloadStepkgBackup.mock.calls.length > 0);
        expect(onDownloadStepkgBackup).toHaveBeenCalledWith('script-1');

        const replaceButton = [...host.querySelectorAll('button')].find(button => button.textContent === 'Replace script');
        const cancelButton = [...host.querySelectorAll('button')].find(button => button.textContent === 'Cancel');
        const confirmationInput = host.querySelector<HTMLInputElement>('input[placeholder="replace me"]');

        expect(replaceButton?.parentElement).toBe(cancelButton?.parentElement);
        expect(replaceButton?.disabled).toBe(true);
        expect(confirmationInput).toBeTruthy();
        expect(window.getComputedStyle(confirmationInput!).fontSize).toBe('12px');

        await userEvent.fill(confirmationInput!, 'replace me');
        expect(replaceButton?.disabled).toBe(false);

        await userEvent.click(replaceButton!);
        expect(onReplaceWithStepkg).toHaveBeenCalledOnce();
    });
});
