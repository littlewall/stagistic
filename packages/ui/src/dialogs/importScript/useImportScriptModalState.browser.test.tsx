import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';

import type {StepkgPeekResult} from './types';
import {useImportScriptModalState} from './useImportScriptModalState';

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

type Api = ReturnType<typeof useImportScriptModalState>;

const mount = (args: Parameters<typeof useImportScriptModalState>[0]) => {
    let api: Api | null = null;
    const Harness = () => {
        api = useImportScriptModalState(args);
        return null;
    };
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<Harness />);
    mountedRoots.push(root);

    return () => api;
};

describe('useImportScriptModalState', () => {
    it('rejects an unsupported file extension', async () => {
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: true, scriptId: 's', packageTitle: 'T', existingLocalTitle: null} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['x'], 'play.fountain')));
        await waitFor(() => getApi()!.fileError !== null);

        expect(getApi()!.fileError).toBe('Only .stagistic or .stepkg files are supported.');
        expect(getApi()!.selectedFile).toBeNull();
    });

    it('shows the name field immediately for a .stagistic selection', async () => {
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: true, scriptId: 's', packageTitle: 'T', existingLocalTitle: null} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['---\ntitle: X\n---'], 'When Night Falls.stagistic')));
        await waitFor(() => getApi()!.selectedFile !== null);

        expect(getApi()!.showNameField).toBe(true);
        expect(getApi()!.showChoiceToggle).toBe(false);
        expect(getApi()!.name).toBe('When Night Falls');
    });

    it('peeks a .stepkg selection and shows only the name field when there is no collision', async () => {
        const onPeekStepkg = vi.fn(() =>
            Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: null} satisfies StepkgPeekResult),
        );
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg,
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);

        expect(onPeekStepkg).toHaveBeenCalledTimes(1);
        expect(getApi()!.showNameField).toBe(true);
        expect(getApi()!.showChoiceToggle).toBe(false);
        expect(getApi()!.name).toBe('My Play');
        expect(getApi()!.canSubmitNew).toBe(true);
    });

    it('reveals the New/Replace choice on collision, and the replace panel when Replace is selected', async () => {
        const onPeekStepkg = () =>
            Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult);
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg,
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);

        expect(getApi()!.showChoiceToggle).toBe(true);
        expect(getApi()!.importChoice).toBe('new');
        expect(getApi()!.showNameField).toBe(true);
        expect(getApi()!.showReplacePanel).toBe(false);

        getApi()!.handleChoiceChange('replace');
        await waitFor(() => getApi()!.importChoice === 'replace');

        expect(getApi()!.showReplacePanel).toBe(true);
        expect(getApi()!.showNameField).toBe(false);
        expect(getApi()!.canSubmitNew).toBe(false);
    });

    it('surfaces a peek failure as a file error and does not reveal the name field', async () => {
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () => Promise.resolve({ok: false, message: "This file isn't a valid Stagistic package."} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['not a zip'], 'broken.stepkg')));
        await waitFor(() => getApi()!.fileError !== null);

        expect(getApi()!.fileError).toBe("This file isn't a valid Stagistic package.");
        expect(getApi()!.showNameField).toBe(false);
    });

    it('calls onReplaceWithStepkg with the selected bytes when replace is confirmed', async () => {
        const onReplaceWithStepkg = vi.fn<(payload: {fileName: string; bytes: Uint8Array}) => Promise<void>>(() => Promise.resolve());
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg,
            onDownloadStepkgBackup: () => Promise.resolve(),
            onPeekStepkg: () =>
                Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);
        getApi()!.handleChoiceChange('replace');
        await waitFor(() => getApi()!.showReplacePanel);

        await getApi()!.handleReplaceConfirm();

        expect(onReplaceWithStepkg).toHaveBeenCalledTimes(1);
        expect(onReplaceWithStepkg.mock.calls[0]?.[0]?.fileName).toBe('play.stepkg');
    });

    it('downloads a backup using the peeked script id', async () => {
        const onDownloadStepkgBackup = vi.fn(() => Promise.resolve());
        const getApi = mount({
            isOpen: true,
            onImportStagistic: () => Promise.resolve(),
            onImportStepkgAsNew: () => Promise.resolve(),
            onReplaceWithStepkg: () => Promise.resolve(),
            onDownloadStepkgBackup,
            onPeekStepkg: () =>
                Promise.resolve({ok: true, scriptId: 'script-1', packageTitle: 'My Play', existingLocalTitle: 'Local Copy'} satisfies StepkgPeekResult),
        });

        await waitFor(() => getApi() !== null);
        getApi()!.handleFileSelect(buildFileList(new File(['zip-bytes'], 'play.stepkg')));
        await waitFor(() => getApi()!.stepkgPeek !== null);

        await getApi()!.handleDownloadBackup();

        expect(onDownloadStepkgBackup).toHaveBeenCalledWith('script-1');
    });
});
