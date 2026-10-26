import '../../styles/base.css';

import {requireValue} from '@stagistic/shared';
import {type KeyboardEvent, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {Button} from '../atoms/Button/Button';
import {Input} from '../atoms/Input/Input';
import {FocusVisibilityManager} from './FocusVisibilityManager';

let root: Root | null = null;

const mount = async (children: ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<><FocusVisibilityManager />{children}</>);
    await expect.poll(() => host.childElementCount).toBeGreaterThan(0);
    // Wait for the manager's passive effect, including under StrictMode.
    await new Promise(resolve => requestAnimationFrame(resolve));

    return host;
};

const ringVisible = () => document.documentElement.hasAttribute('data-focus-ring-visible');
const outline = (element: Element) => getComputedStyle(element).outlineStyle;

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('application focus visibility', () => {
    it('does not inherit a pointer-focused text field ring during programmatic focus', async () => {
        const host = await mount(<><Input aria-label="Title" /><Button>Save</Button><button type="button">Plain action</button></>);
        const input = requireValue(host.querySelector('input'));
        const buttons = host.querySelectorAll('button');

        await userEvent.click(input);
        await userEvent.keyboard('draft');
        expect(outline(input)).toBe('none');

        for (const button of buttons) {
            button.focus();
            expect(outline(button)).toBe('none');
        }
    });

    it('shows rings after Tab and Shift+Tab and hides them on pointer down', async () => {
        const host = await mount(<><Button>First</Button><Input aria-label="Title" /></>);
        const button = requireValue(host.querySelector('button'));
        const input = requireValue(host.querySelector('input'));

        await userEvent.tab();
        expect(document.activeElement).toBe(button);
        expect(outline(button)).toBe('solid');
        await userEvent.tab();
        expect(document.activeElement).toBe(input);
        expect(outline(input)).toBe('solid');
        await userEvent.tab({shift: true});
        expect(document.activeElement).toBe(button);
        expect(outline(button)).toBe('solid');
        await userEvent.click(button);
        expect(outline(button)).toBe('none');
    });

    it('keeps consumed editor Tab from enabling rings on a later focus transfer', async () => {
        const host = await mount(
            <>
                <div role="dialog" aria-label="Script dialog">
                    <div role="textbox" aria-label="Script" tabIndex={0} contentEditable suppressContentEditableWarning onKeyDown={event => event.key === 'Tab' && event.preventDefault()}>Scene</div>
                </div>
                <Button>Toolbar</Button>
            </>,
        );
        const editor = requireValue(host.querySelector<HTMLElement>('[contenteditable]'));

        await userEvent.click(editor);
        await userEvent.tab();
        expect(document.activeElement).toBe(editor);
        expect(ringVisible()).toBe(false);
        requireValue(host.querySelector('button')).focus();
        expect(outline(requireValue(host.querySelector('button')))).toBe('none');
    });

    it.each([
        'ArrowDown',
        'Home',
        'End',
    ])('confirms %s only after it moves focus', async key => {
        const host = await mount(
            <>
                <Button
                    onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                        if (event.key === key) {
                            event.currentTarget.nextElementSibling?.querySelector('button')?.focus();
                        }
                    }}
                >First
                </Button>
                <div><Button>Second</Button></div>
            </>,
        );
        const buttons = host.querySelectorAll('button');

        await userEvent.click(buttons[0]);
        await userEvent.keyboard(`{${key}}`);
        expect(document.activeElement).toBe(buttons[1]);
        expect(outline(buttons[1])).toBe('solid');
    });

    it.each([
        '{Enter}',
        ' ',
        '{Escape}',
        '{Control>}k{/Control}',
        '{Meta>}k{/Meta}',
    ])('preserves pointer mode after %s', async keys => {
        const host = await mount(<><Input aria-label="Title" /><Button>Action</Button></>);

        await userEvent.click(requireValue(host.querySelector('input')));
        await userEvent.keyboard(keys);
        requireValue(host.querySelector('button')).focus();
        expect(outline(requireValue(host.querySelector('button')))).toBe('none');
    });

    it.each([
        'input',
        'textarea',
        'editor',
    ])('ignores caret navigation in %s', async kind => {
        const host = await mount(
            <>
                {kind === 'input' && <Input aria-label="Title" />}
                {kind === 'textarea' && <textarea aria-label="Notes" />}
                {kind === 'editor' && <div contentEditable suppressContentEditableWarning>Scene</div>}
                <Button>Action</Button>
            </>,
        );

        await userEvent.click(requireValue(host.firstElementChild));
        await userEvent.keyboard('{ArrowLeft}{ArrowRight}{Home}{End}');
        expect(ringVisible()).toBe(false);
        requireValue(host.querySelector('button')).focus();
        expect(outline(requireValue(host.querySelector('button')))).toBe('none');
    });

    it('keeps an unused navigation key from arming a later focus transfer', async () => {
        const host = await mount(<><Button>First</Button><Button>Second</Button></>);
        const buttons = host.querySelectorAll('button');

        await userEvent.click(buttons[0]);
        await userEvent.keyboard('{ArrowDown}');
        expect(ringVisible()).toBe(false);
        buttons[1].focus();
        expect(outline(buttons[1])).toBe('none');
    });

    it.each(['Control', 'Meta'])('keeps %s shortcuts that transfer focus in pointer mode', async modifier => {
        const host = await mount(
            <>
                <textarea
                    aria-label="Script"
                    onKeyDown={event => {
                        if (event.key === 'k' && (event.ctrlKey || event.metaKey)) {
                            event.preventDefault();
                            (event.currentTarget.nextElementSibling as HTMLElement).focus();
                        }
                    }}
                />
                <Button variant="ghost">Command action</Button>
            </>,
        );
        const action = requireValue(host.querySelector('button'));

        await userEvent.click(requireValue(host.querySelector('textarea')));
        await userEvent.keyboard(`{${modifier}>}k{/${modifier}}`);
        expect(document.activeElement).toBe(action);
        expect(outline(action)).toBe('none');
    });

    it('keeps keyboard visibility while typing and transferring focus programmatically', async () => {
        const host = await mount(<><Input aria-label="Title" /><Button>Action</Button></>);
        const action = requireValue(host.querySelector('button'));

        await userEvent.tab();
        await userEvent.keyboard('draft');
        action.focus();
        expect(outline(action)).toBe('solid');
    });

    it('recognizes navigation that focuses a submenu on the next animation frame', async () => {
        const host = await mount(
            <>
                <Button
                    onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                        if (event.key === 'ArrowRight') {
                            event.preventDefault();

                            const next = event.currentTarget.nextElementSibling as HTMLElement;

                            requestAnimationFrame(() => next.focus());
                        }
                    }}
                >Submenu
                </Button>
                <Button>Submenu action</Button>
            </>,
        );
        const buttons = host.querySelectorAll('button');

        await userEvent.click(buttons[0]);
        await userEvent.keyboard('{ArrowRight}');
        await expect.poll(() => document.activeElement).toBe(buttons[1]);
        expect(outline(buttons[1])).toBe('solid');
    });

    it('confirms virtual focus movement without moving DOM focus', async () => {
        const host = await mount(
            <div
                role="listbox"
                tabIndex={0}
                aria-label="Actions"
                aria-activedescendant="action-one"
                onKeyDown={event => {
                    if (event.key === 'ArrowDown') {
                        event.currentTarget.setAttribute('aria-activedescendant', 'action-two');
                    }
                }}
            >
                <div id="action-one" role="option" aria-selected={false}>First</div>
                <div id="action-two" role="option" aria-selected={false}>Second</div>
            </div>,
        );
        const list = requireValue(host.firstElementChild);

        await userEvent.click(list);
        await userEvent.keyboard('{ArrowDown}');
        expect(document.activeElement).toBe(list);
        expect(ringVisible()).toBe(true);
    });

    it('removes the signal and listeners on unmount', async () => {
        await mount(<Button>Action</Button>);
        await userEvent.tab();
        expect(ringVisible()).toBe(true);
        requireValue(root).unmount();
        root = null;
        expect(ringVisible()).toBe(false);
        await userEvent.keyboard('{Tab}');
        expect(ringVisible()).toBe(false);
    });
});
