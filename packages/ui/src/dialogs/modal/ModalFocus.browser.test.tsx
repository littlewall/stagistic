import '../../../styles/base.css';

import {requireValue} from '@stagistic/shared';
import {
    StrictMode,
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

import {FocusVisibilityManager} from '../../layout/FocusVisibilityManager';
import {ConfirmModal} from './ConfirmModal';
import {ModalDialog} from './ModalDialog';

let root: Root | null = null;

const Harness = ({removeTrigger = false, unmountOnClose = false}: {removeTrigger?: boolean, unmountOnClose?: boolean}) => {
    const trigger = useRef<HTMLButtonElement>(null);
    const field = useRef<HTMLInputElement>(null);
    const fallback = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [started, setStarted] = useState(false);

    return (
        <>
            <FocusVisibilityManager />
            <textarea aria-label="Editor" />
            <button type="button" ref={fallback}>Fallback</button>
            {!(started && removeTrigger) && (
                <button
                    type="button"
                    ref={trigger}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                        setStarted(true);
                        setOpen(true);
                    }}
                >Open
                </button>
            )}
            {!(started && !open && unmountOnClose) && (
                <ModalDialog
                    isOpen={open}
                    onClose={() => setOpen(false)}
                    ariaLabel="Edit"
                    returnFocus={trigger}
                    fallbackFocus={fallback}
                    initialFocus={field}
                    selectInitialFocus
                >
                    <button type="button" data-modal-close onClick={() => setOpen(false)}>Close</button>
                    <input ref={field} aria-label="Title" defaultValue="Draft" />
                    <input aria-label="Hidden" hidden />
                    <fieldset disabled><input aria-label="Disabled" /></fieldset>
                </ModalDialog>
            )}
        </>
    );
};

const mount = async (children = <Harness />) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<StrictMode>{children}</StrictMode>);
    await expect.poll(() => host.querySelector('button')).not.toBeNull();

    return host;
};

const findButton = (host: ParentNode, text: string) => requireValue(Array.from(host.querySelectorAll('button')).find(button => button.textContent === text));
const openDialog = async (host: HTMLElement) => {
    await userEvent.click(requireValue(host.querySelector('textarea')));
    await userEvent.click(findButton(host, 'Open'));
    await expect.poll(() => host.querySelector('dialog[open]')).not.toBeNull();
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('native dialog focus contract', () => {
    it('keeps a parent modal open and restores its trigger after Escape in a child', async () => {
        const Nested = () => {
            const [parentOpen, setParentOpen] = useState(true);
            const [childOpen, setChildOpen] = useState(false);
            const trigger = useRef<HTMLButtonElement>(null);

            return (
                <ModalDialog isOpen={parentOpen} onClose={() => setParentOpen(false)} ariaLabel="Parent">
                    <button type="button" ref={trigger} onClick={() => setChildOpen(true)}>Open child</button>
                    <ModalDialog isOpen={childOpen} returnFocus={trigger} onClose={() => setChildOpen(false)} ariaLabel="Child">
                        <input aria-label="Child title" />
                        <button type="button" onClick={() => setChildOpen(false)}>Close child</button>
                    </ModalDialog>
                </ModalDialog>
            );
        };
        const host = await mount(<Nested />);

        await userEvent.click(findButton(host, 'Open child'));
        await expect.poll(() => host.querySelector('dialog[aria-label="Child"][open]')).not.toBeNull();
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => host.querySelector('dialog[aria-label="Child"]')).toBeNull();
        expect(host.querySelector('dialog[aria-label="Parent"][open]')).not.toBeNull();
        expect(document.activeElement).toBe(findButton(host, 'Open child'));
    });

    it('traps Tab inside the child instead of including the parent controls', async () => {
        const Nested = () => {
            const [childOpen, setChildOpen] = useState(false);

            return (
                <ModalDialog isOpen onClose={() => {}} ariaLabel="Parent">
                    <button type="button" onClick={() => setChildOpen(true)}>Open child</button>
                    <ModalDialog isOpen={childOpen} onClose={() => setChildOpen(false)} ariaLabel="Child">
                        <input aria-label="Child title" />
                        <button type="button">Last child action</button>
                    </ModalDialog>
                </ModalDialog>
            );
        };
        const host = await mount(<Nested />);

        await userEvent.click(findButton(host, 'Open child'));
        await expect.poll(() => document.activeElement).toBe(host.querySelector('input'));
        await userEvent.tab({shift: true});
        expect(document.activeElement).toBe(findButton(host, 'Last child action'));
        await userEvent.tab();
        expect(document.activeElement).toBe(host.querySelector('input'));
    });

    it('focuses and selects the explicit initial field before any opening timer', async () => {
        const host = await mount();

        await openDialog(host);

        const field = requireValue(host.querySelector<HTMLInputElement>('input[aria-label="Title"]'));

        expect(document.activeElement).toBe(field);
        expect(field.selectionStart).toBe(0);
        expect(field.selectionEnd).toBe(5);
        expect(getComputedStyle(field).outlineStyle).toBe('none');
    });

    it.each([
        'pointer',
        'Escape',
        'Enter',
    ])('returns once to the explicit trigger after %s, despite the editor having focus on open', async method => {
        const host = await mount();
        const trigger = findButton(host, 'Open');

        await openDialog(host);

        let focusCount = 0;

        trigger.addEventListener('focus', () => {
            focusCount += 1;
        });

        if (method === 'pointer') {
            await userEvent.click(findButton(host, 'Close'));
        }

        if (method === 'Escape') {
            await userEvent.keyboard('{Escape}');
        }

        if (method === 'Enter') {
            findButton(host, 'Close').focus();
            await userEvent.keyboard('{Enter}');
        }

        await expect.poll(() => host.querySelector('dialog')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(focusCount).toBe(1);
        expect(getComputedStyle(trigger).outlineStyle).toBe('none');
    });

    it('uses a live fallback when the opening trigger disappears', async () => {
        const host = await mount(<Harness removeTrigger />);

        await openDialog(host);
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => document.activeElement).toBe(findButton(host, 'Fallback'));
    });

    it('restores once when the open dialog is unmounted by its owner', async () => {
        const host = await mount(<Harness unmountOnClose />);
        const trigger = findButton(host, 'Open');

        await openDialog(host);

        let focusCount = 0;

        trigger.addEventListener('focus', () => {
            focusCount += 1;
        });
        await userEvent.click(findButton(host, 'Close'));
        await expect.poll(() => host.querySelector('dialog')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(focusCount).toBe(1);
    });

    it('ignores hidden and disabled fields when wrapping Tab', async () => {
        const host = await mount();

        await openDialog(host);
        await userEvent.tab();
        expect(document.activeElement).toBe(findButton(host, 'Close'));
        await userEvent.tab({shift: true});
        expect(document.activeElement).toBe(host.querySelector('input[aria-label="Title"]'));
    });

    it('defaults confirmations to the safe action', async () => {
        const host = await mount(<ConfirmModal isOpen ariaLabel="Delete scene" title="Delete scene?" confirmLabel="Delete" onClose={() => {}} onConfirm={() => {}} />);

        await expect.poll(() => document.activeElement).toBe(findButton(host, 'Cancel'));
    });
});
