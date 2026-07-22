import '@stagistic/ui/styles/base.css';

import type {ComponentType} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {AddMusicModal} from './AddMusicModal';
import type {CreateScriptMusicInput} from './types';

interface CancellableAddMusicModalProps {
    isOpen: boolean,
    initialTitle?: string,
    onCancel: () => void,
    onClose: () => void,
    onCreate: (input: CreateScriptMusicInput) => unknown,
}

const CancellableAddMusicModal = AddMusicModal as ComponentType<CancellableAddMusicModalProps>;
const roots: Root[] = [];

const mountModal = ({
    onCancel = () => {},
    onClose = () => {},
    onCreate = () => {},
}: Partial<CancellableAddMusicModalProps> = {}) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <CancellableAddMusicModal
            isOpen
            initialTitle="Night"
            onCancel={onCancel}
            onClose={onClose}
            onCreate={onCreate}
        />,
    );
    roots.push(root);
};

const findButton = (label: string) => {
    return [...document.querySelectorAll<HTMLButtonElement>('button')]
        .find(button => button.textContent?.trim() === label) ?? null;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('AddMusicModal', () => {
    it('uses the cancellation callback when Cancel is pressed', async () => {
        const onCancel = vi.fn();
        const onClose = vi.fn();

        mountModal({onCancel, onClose});

        await vi.waitFor(() => expect(findButton('Cancel')).not.toBeNull());

        const cancel = findButton('Cancel');

        await userEvent.click(cancel!);

        expect(onCancel).toHaveBeenCalledOnce();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes without cancelling after successful creation', async () => {
        const onCancel = vi.fn();
        const onClose = vi.fn();
        const onCreate = vi.fn(() => Promise.resolve({id: 'music-created'}));

        mountModal({
            onCancel,
            onClose,
            onCreate,
        });

        await vi.waitFor(() => expect(findButton('Add music')).not.toBeNull());

        const submit = findButton('Add music');

        await userEvent.click(submit!);

        await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
        expect(onCancel).not.toHaveBeenCalled();
    });
});
