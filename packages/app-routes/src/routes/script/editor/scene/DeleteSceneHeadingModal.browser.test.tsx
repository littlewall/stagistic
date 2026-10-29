import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ConvertSceneHeadingModal} from './ConvertSceneHeadingModal';
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
        expect([...document.querySelectorAll('li')].map(item => item.textContent)).toEqual([
            'RemovedIts outline, places and character notes from the Board',
            'KeptBlocks in this scene, moved under the previous scene',
        ]);
        expect(findButton('Cancel')).not.toBeNull();
        expect(document.body.textContent).toContain('Undo restores these until you create a draft or version.');
    });

    it('fires onConfirm when Delete heading is pressed', async () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();

        mountModal({onConfirm, onClose});

        await vi.waitFor(() => expect(findButton('Delete heading')).not.toBeNull());

        await userEvent.click(requireValue(findButton('Delete heading')));

        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('fires onClose when Cancel is pressed', async () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();

        mountModal({onConfirm, onClose});

        await vi.waitFor(() => expect(findButton('Cancel')).not.toBeNull());

        await userEvent.click(requireValue(findButton('Cancel')));

        expect(onClose).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });
    it('explains Board metadata removal and Undo when converting a heading', async () => {
        const host = document.createElement('div');

        document.body.append(host);

        const root = createRoot(host);

        roots.push(root);
        root.render(<ConvertSceneHeadingModal isOpen onClose={() => {}} onConfirm={() => {}} />);
        await vi.waitFor(() => expect(findButton('Convert heading')).not.toBeNull());
        expect(document.body.textContent).toContain('Its outline, places and character notes from the Board');
        expect(document.body.textContent).toContain('Undo restores these until you create a draft or version.');
    });
});
