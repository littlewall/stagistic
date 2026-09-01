import '@stagistic/ui/styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {DeleteSceneHeadingModal} from './DeleteSceneHeadingModal';

interface MountOptions {
    isDeleting?: boolean,
    onClose?: () => void,
    onConfirm?: () => void | Promise<void>,
}

const roots: Root[] = [];

const mountModal = ({
    isDeleting = false,
    onClose = () => {},
    onConfirm = () => {},
}: MountOptions = {}) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <DeleteSceneHeadingModal
            isOpen
            isDeleting={isDeleting}
            onClose={onClose}
            onConfirm={onConfirm}
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

describe('DeleteSceneHeadingModal', () => {
    it('renders the exact confirmation copy', async () => {
        mountModal();

        await vi.waitFor(() => expect(findButton('Delete heading')).not.toBeNull());

        expect(document.body.textContent).toContain('Delete scene heading?');
        expect(document.body.textContent).toContain(
            'Its synopsis and places will be removed. Blocks in this scene stay and move under the previous scene.',
        );
        expect(findButton('Cancel')).not.toBeNull();
    });

    it('fires onConfirm when Delete heading is pressed', async () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();

        mountModal({onConfirm, onClose});

        await vi.waitFor(() => expect(findButton('Delete heading')).not.toBeNull());

        await userEvent.click(findButton('Delete heading')!);

        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('fires onClose when Cancel is pressed', async () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();

        mountModal({onConfirm, onClose});

        await vi.waitFor(() => expect(findButton('Cancel')).not.toBeNull());

        await userEvent.click(findButton('Cancel')!);

        expect(onClose).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
