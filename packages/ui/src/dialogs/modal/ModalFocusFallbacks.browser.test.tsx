import '../../../styles/base.css';

import {requireValue} from '@stagistic/shared';
import {
    type ReactNode,
    useRef,
    useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ModalDialog} from './ModalDialog';

let root: Root | null = null;

const mount = async (children: ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(children);
    await expect.poll(() => host.querySelector('button')).not.toBeNull();

    return host;
};

const button = (host: ParentNode, label: string) => requireValue(Array.from(host.querySelectorAll('button')).find(element => element.textContent === label));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('modal focus fallbacks', () => {
    it.each(['hidden', 'disabled'] as const)('uses a fallback when the trigger becomes %s', async unavailable => {
        const Harness = () => {
            const trigger = useRef<HTMLButtonElement>(null);
            const fallback = useRef<HTMLButtonElement>(null);
            const [open, setOpen] = useState(false);
            const [changed, setChanged] = useState(false);

            return (
                <>
                    <button ref={trigger} type="button" hidden={changed && unavailable === 'hidden'} disabled={changed && unavailable === 'disabled'} onClick={() => setOpen(true)}>Open</button>
                    <button ref={fallback} type="button">Fallback</button>
                    <ModalDialog isOpen={open} returnFocus={trigger} fallbackFocus={fallback} onClose={() => setOpen(false)} ariaLabel="Edit">
                        <button
                            type="button"
                            onClick={() => {
                                setChanged(true);
                                setOpen(false);
                            }}
                        >Save
                        </button>
                    </ModalDialog>
                </>
            );
        };
        const host = await mount(<Harness />);

        await userEvent.click(button(host, 'Open'));
        await expect.poll(() => host.querySelector('dialog[open]')).not.toBeNull();
        await userEvent.click(button(host, 'Save'));
        await expect.poll(() => document.activeElement).toBe(button(host, 'Fallback'));
    });

    it('does not steal focus when an initially disabled field becomes available', async () => {
        const Harness = () => {
            const field = useRef<HTMLInputElement>(null);
            const [disabled, setDisabled] = useState(true);

            return (
                <ModalDialog isOpen initialFocus={field} onClose={() => {}} ariaLabel="Loading form">
                    <input ref={field} aria-label="Title" disabled={disabled} />
                    <button data-modal-initial-focus type="button">Cancel</button>
                    <button type="button" onClick={() => setDisabled(false)}>Load field</button>
                </ModalDialog>
            );
        };
        const host = await mount(<Harness />);

        await expect.poll(() => document.activeElement).toBe(button(host, 'Cancel'));
        button(host, 'Load field').focus();
        expect(document.activeElement).toBe(button(host, 'Load field'));
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => host.querySelector('input')?.disabled).toBe(false);
        expect(document.activeElement).toBe(button(host, 'Load field'));
    });

    it('keeps focus in the new dialog when the previous owner unmounts', async () => {
        const Harness = () => {
            const trigger = useRef<HTMLButtonElement>(null);
            const [previous, setPrevious] = useState(true);
            const [next, setNext] = useState(false);

            return (
                <>
                    <button ref={trigger} type="button">Previous trigger</button>
                    {previous && (
                        <ModalDialog isOpen returnFocus={trigger} onClose={() => {}} ariaLabel="Previous">
                            <button type="button" onClick={() => setNext(true)}>Open next</button>
                        </ModalDialog>
                    )}
                    <ModalDialog isOpen={next} onClose={() => {}} ariaLabel="Next">
                        <button type="button" onClick={() => setPrevious(false)}>Unmount previous</button>
                        <input aria-label="Next title" />
                    </ModalDialog>
                </>
            );
        };
        const host = await mount(<Harness />);

        await userEvent.click(button(host, 'Open next'));
        await expect.poll(() => host.querySelector('dialog[aria-label="Next"][open]')).not.toBeNull();
        await expect.poll(() => document.activeElement).toBe(host.querySelector('[aria-label="Next title"]'));
        button(host, 'Unmount previous').focus();
        expect(document.activeElement).toBe(button(host, 'Unmount previous'));
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => host.querySelector('dialog[aria-label="Previous"]')).toBeNull();
        expect(document.activeElement).toBe(button(host, 'Unmount previous'));
    });

    it('restores to the current main content when navigation removes the opener and editor', async () => {
        const Harness = () => {
            const trigger = useRef<HTMLButtonElement>(null);
            const [navigated, setNavigated] = useState(false);
            const [open, setOpen] = useState(false);

            return (
                <>
                    <main data-modal-focus-fallback>
                        {navigated ? 'New route' : (
                            <>
                                <div contentEditable suppressContentEditableWarning>Editor</div>
                                <button ref={trigger} type="button" onClick={() => setOpen(true)}>Open</button>
                            </>
                        )}
                    </main>
                    <ModalDialog isOpen={open} returnFocus={trigger} onClose={() => setOpen(false)} ariaLabel="Navigate">
                        <button
                            type="button"
                            onClick={() => {
                                setNavigated(true);
                                setOpen(false);
                            }}
                        >Navigate
                        </button>
                    </ModalDialog>
                </>
            );
        };
        const host = await mount(<Harness />);

        await userEvent.click(button(host, 'Open'));
        await expect.poll(() => host.querySelector('dialog[open]')).not.toBeNull();
        await userEvent.click(button(host, 'Navigate'));
        await expect.poll(() => document.activeElement).toBe(host.querySelector('main'));
        expect(host.querySelector('main')?.textContent).toBe('New route');
    });
});
