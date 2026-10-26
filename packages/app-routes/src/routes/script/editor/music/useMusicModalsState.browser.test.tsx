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

import {AddMusicModal} from './AddMusicModal';
import {MusicSidebarContextActions} from './MusicSidebarContextActions';
import {useMusicModalsState} from './useMusicModalsState';

let root: Root | null = null;

const Harness = () => {
    const modals = useMusicModalsState({
        createMusic: vi.fn(),
        unassignMusic: vi.fn(),
    });

    return (
        <main>
            <div contentEditable suppressContentEditableWarning role="textbox" aria-label="Script editor">
                Scene one
            </div>
            <MusicSidebarContextActions onAddMusic={modals.addMusic.open} />
            <button
                type="button"
                onMouseDown={event => {
                    event.preventDefault();
                    modals.handleRequestCreateMusic({
                        blockId: 'block-1',
                        title: 'Gutter music',
                        complete: vi.fn(),
                    });
                }}
            >
                Insert editor music
            </button>
            <button
                type="button"
                onMouseDown={event => {
                    event.preventDefault();
                    modals.addMusic.open();
                }}
            >
                Add without trigger
            </button>
            <AddMusicModal
                isOpen={modals.addMusic.isOpen}
                initialTitle={modals.addMusic.initialTitle}
                returnFocus={modals.addMusic.returnFocus}
                onCancel={modals.addMusic.cancel}
                onClose={modals.addMusic.close}
                onCreate={modals.addMusic.create}
            />
        </main>
    );
};

const mount = async () => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<Harness />);

    await expect.poll(() => document.querySelector('[aria-label="Add music"]')).not.toBeNull();

    const editor = document.querySelector('[aria-label="Script editor"]') as HTMLElement;
    const trigger = document.querySelector('button[aria-label="Add music"]') as HTMLButtonElement;

    editor.focus();
    await expect.poll(() => document.activeElement).toBe(editor);

    return {editor, trigger};
};

const cancel = async () => {
    await expect.poll(() => document.querySelector('dialog[open] input')).not.toBeNull();

    const button = Array.from(document.querySelectorAll<HTMLButtonElement>('dialog[open] button'))
        .find(candidate => candidate.textContent === 'Cancel');

    await userEvent.click(button as HTMLButtonElement);
    await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('music modal return focus', () => {
    it('returns to Add music after a pointer open while the editor has focus', async () => {
        const {trigger} = await mount();

        await userEvent.click(trigger);
        await cancel();

        await expect.poll(() => document.activeElement).toBe(trigger);
    });

    it.each(['Insert editor music', 'Add without trigger'])('clears a previous sidebar target for %s', async label => {
        const {editor, trigger} = await mount();

        await userEvent.click(trigger);
        await cancel();
        editor.focus();
        await expect.poll(() => document.activeElement).toBe(editor);

        const open = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
            .find(button => button.textContent === label);

        await userEvent.click(open as HTMLButtonElement);
        await cancel();

        await expect.poll(() => document.activeElement).toBe(editor);
    });
});
