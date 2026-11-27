import type * as AppCore from '@stagistic/app-core';
import type {ScriptRepository, ScriptSummary} from '@stagistic/app-core';
import {requireValue} from '@stagistic/shared';
import {
    act,
    type Dispatch,
    type SetStateAction,
    useLayoutEffect,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import type {NavigateFunction} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {useGlobalModalMutations} from './useGlobalModalMutations';

vi.mock('@stagistic/app-core', async importOriginal => ({
    ...await importOriginal<typeof AppCore>(),
    importScriptPackageAsNew: vi.fn(() => Promise.resolve({
        ok: true,
        scriptId: 'script-copy',
        title: 'Long Day (copy)',
    })),
}));

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

describe('useGlobalModalMutations', () => {
    it('starts an editor route transition without closing the modal', async () => {
        const sequence: string[] = [];
        const navigate = vi.fn((destination: string) => {
            sequence.push(`navigate:${destination}`);
        }) as unknown as NavigateFunction;
        const setNewScriptTransitionPath: Dispatch<SetStateAction<string | null>> = value => {
            if (typeof value === 'string') {
                sequence.push(`target:${value}`);
            }
        };
        const noopSetter = () => {};
        let handleCreate: ((name: string, shape: 'multi-act' | 'one-act') => Promise<void>) | null = null;

        const Harness = () => {
            const mutations = useGlobalModalMutations({
                scriptActions: {
                    createScript: () => Promise.resolve('script-1'),
                    renameScript: () => Promise.resolve(),
                    duplicateScript: () => Promise.resolve('script-copy'),
                    deleteScript: () => Promise.resolve(),
                },
                repository: {} as ScriptRepository,
                saveTitlePage: () => Promise.resolve(),
                navigate,
                addToast: vi.fn(),
                scriptToDelete: null,
                scriptToRename: null,
                scriptToDuplicate: null,
                setNewScriptTransitionPath,
                setIsImportOpen: noopSetter,
                setIsImportLoading: noopSetter,
                setIsDownloadingBackup: noopSetter,
                setPrefilledImport: noopSetter,
                setScriptToDelete: noopSetter,
                setIsDeleting: noopSetter,
                setScriptToRename: noopSetter,
                setIsRenaming: noopSetter,
                setScriptToDuplicate: noopSetter,
                setIsDuplicating: noopSetter,
            });

            useLayoutEffect(() => {
                handleCreate = mutations.handleCreate;
            }, [mutations]);

            return null;
        };
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(<Harness />);
        mountedRoots.push(root);
        await waitFor(() => handleCreate !== null);

        await act(async () => {
            await handleCreate?.('Long Day', 'multi-act');
        });

        expect(sequence).toEqual(['target:/script/script-1/editor', 'navigate:/script/script-1/editor']);
    });

    it('opens an imported package copy only once the script list knows it', async () => {
        const navigate = vi.fn() as unknown as NavigateFunction;
        // Set from callbacks; an object keeps TypeScript from narrowing them to null.
        const handles: {
            emit?: (rows: readonly ScriptSummary[]) => void,
            importAsNew?: (payload: {
                fileName: string,
                bytes: Uint8Array,
                title: string,
            }) => Promise<void>,
        } = {};
        const repository = {
            scriptSummaries: {
                subscribe: (listener: (rows: readonly ScriptSummary[]) => void) => {
                    handles.emit = listener;

                    return Promise.resolve(() => {});
                },
            },
        } as unknown as ScriptRepository;
        const noopSetter = () => {};

        const Harness = () => {
            const mutations = useGlobalModalMutations({
                scriptActions: {
                    createScript: () => Promise.resolve('script-1'),
                    renameScript: () => Promise.resolve(),
                    duplicateScript: () => Promise.resolve('script-copy'),
                    deleteScript: () => Promise.resolve(),
                },
                repository,
                saveTitlePage: () => Promise.resolve(),
                navigate,
                addToast: vi.fn(),
                scriptToDelete: null,
                scriptToRename: null,
                scriptToDuplicate: null,
                setNewScriptTransitionPath: noopSetter,
                setIsImportOpen: noopSetter,
                setIsImportLoading: noopSetter,
                setIsDownloadingBackup: noopSetter,
                setPrefilledImport: noopSetter,
                setScriptToDelete: noopSetter,
                setIsDeleting: noopSetter,
                setScriptToRename: noopSetter,
                setIsRenaming: noopSetter,
                setScriptToDuplicate: noopSetter,
                setIsDuplicating: noopSetter,
            });

            useLayoutEffect(() => {
                handles.importAsNew = mutations.handleImportStepkgAsNew;
            }, [mutations]);

            return null;
        };
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(<Harness />);
        mountedRoots.push(root);
        await waitFor(() => handles.importAsNew !== undefined);

        const done = requireValue(handles.importAsNew)({
            fileName: 'Long Day.stepkg',
            bytes: new Uint8Array(),
            title: 'Long Day (copy)',
        });

        await waitFor(() => handles.emit !== undefined);
        // The list still shows only the original: opening the copy now would bounce to the original.
        requireValue(handles.emit)([{id: 'script-1'} as ScriptSummary]);
        await new Promise(resolve => window.setTimeout(resolve, 30));
        expect(navigate).not.toHaveBeenCalled();

        requireValue(handles.emit)([{id: 'script-1'} as ScriptSummary, {id: 'script-copy'} as ScriptSummary]);
        await act(async () => {
            await done;
        });

        expect(navigate).toHaveBeenCalledWith('/script/script-copy/editor');
    });
});
