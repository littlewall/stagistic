import {
    act,
    type Dispatch,
    type SetStateAction,
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
            ({handleCreate} = useGlobalModalMutations({
                scriptActions: {
                    createScript: () => Promise.resolve('script-1'),
                    renameScript: () => Promise.resolve(),
                    duplicateScript: () => Promise.resolve('script-copy'),
                    deleteScript: () => Promise.resolve(),
                },
                saveTitlePage: () => Promise.resolve(),
                navigate,
                addToast: vi.fn(),
                scriptToDelete: null,
                scriptToRename: null,
                scriptToDuplicate: null,
                setNewScriptTransitionPath,
                setIsImportOpen: noopSetter,
                setIsImportLoading: noopSetter,
                setPrefilledImport: noopSetter,
                setScriptToDelete: noopSetter,
                setIsDeleting: noopSetter,
                setScriptToRename: noopSetter,
                setIsRenaming: noopSetter,
                setScriptToDuplicate: noopSetter,
                setIsDuplicating: noopSetter,
            }));

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
});
