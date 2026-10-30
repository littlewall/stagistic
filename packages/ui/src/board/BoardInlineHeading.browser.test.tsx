import '../../styles/tokens.css';

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

import {BoardInlineHeading} from './BoardInlineHeading';

let root: Root | undefined;
const waitFor = async <T extends Element>(selector: string): Promise<T> => {
    const end = Date.now() + 1500;

    while (Date.now() < end) {
        const element = document.querySelector<T>(selector);

        if (element) return element;

        await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Missing ${selector}`);
};

const mount = (props: Partial<Parameters<typeof BoardInlineHeading>[0]> = {}) => {
    const host = document.createElement('div');
    const commit = vi.fn(() => true);

    host.style.width = '200px';
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<h3>{'2. '}<BoardInlineHeading value="OLD" label="Rename scene" kind="scene" onCommit={commit} {...props} /></h3>);

    return commit;
};

afterEach(() => {
    root?.unmount();
    root = undefined;
    document.body.innerHTML = '';
});

describe('BoardInlineHeading', () => {
    it('commits once on Enter and cancels with Escape', async () => {
        const commit = mount();

        await userEvent.click(await waitFor('[role="button"]'));

        const field = await waitFor<HTMLElement>('[role="textbox"]');

        await userEvent.clear(field);
        await userEvent.type(field, 'NEW');
        await userEvent.keyboard('{Enter}');
        expect(commit).toHaveBeenCalledExactlyOnceWith('NEW');
        expect(document.activeElement?.getAttribute('role')).toBe('button');
        await userEvent.click(await waitFor('[role="button"]'));
        await userEvent.clear(await waitFor<HTMLElement>('[role="textbox"]'));
        await userEvent.keyboard('{Escape}');
        expect(commit).toHaveBeenCalledTimes(1);
        expect((await waitFor('[role="button"]')).textContent).toBe('OLD');
    });

    it('edits the name where it stands and saves when the focus leaves it', async () => {
        const commit = mount({value: 'A LONG SCENE NAME THAT WRAPS'});
        const name = await waitFor<HTMLElement>('[role="button"]');
        const before = name.getBoundingClientRect();

        await userEvent.click(name);

        const field = await waitFor<HTMLElement>('[role="textbox"]');
        const during = field.getBoundingClientRect();

        expect(field).toBe(name);
        expect([
            during.left,
            during.top,
            during.width,
        ]).toEqual([
            before.left,
            before.top,
            before.width,
        ]);
        expect(document.querySelector('button')).toBeNull();
        // The caret lands where the name was clicked; move it to the end of the wrapped name.
        window.getSelection()?.selectAllChildren(field);
        window.getSelection()?.collapseToEnd();
        await userEvent.keyboard(' X');
        await userEvent.click(document.body);
        expect(commit).toHaveBeenCalledExactlyOnceWith('A LONG SCENE NAME THAT WRAPS X');
    });

    it('types no leading or doubled spaces and joins any that remain', async () => {
        const commit = mount({value: 'A'});

        await userEvent.click(await waitFor('[role="button"]'));

        const field = await waitFor<HTMLElement>('[role="textbox"]');

        await userEvent.clear(field);
        await userEvent.keyboard('  one   two  ');
        expect(field.textContent).toBe('one two ');
        await userEvent.keyboard('{Enter}');
        expect(commit).toHaveBeenCalledExactlyOnceWith('one two');
    });

    it('keeps a scene named: an emptied name is restored on blur', async () => {
        const commit = mount();

        await userEvent.click(await waitFor('[role="button"]'));
        await userEvent.clear(await waitFor<HTMLElement>('[role="textbox"]'));
        await userEvent.keyboard('{Enter}');
        expect(document.querySelector('[role="textbox"]')).not.toBeNull();
        requireValue(document.querySelector<HTMLElement>('[role="textbox"]')).blur();
        expect(commit).not.toHaveBeenCalled();
        expect((await waitFor('[role="button"]')).textContent).toBe('OLD');
    });

    it('pastes plain text on one line', async () => {
        const commit = mount({kind: 'act', value: 'ACT ONE'});

        await userEvent.click(await waitFor('[role="button"]'));

        const field = await waitFor<HTMLElement>('[role="textbox"]');
        const clipboardData = new DataTransfer();

        window.getSelection()?.selectAllChildren(field);
        clipboardData.setData('text/plain', 'The\n  storm');
        field.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData,
            bubbles: true,
            cancelable: true,
        }));
        await userEvent.keyboard('{Enter}');
        expect(commit).toHaveBeenCalledExactlyOnceWith('The storm');
    });

    it('starts editing a new name with all of it selected', async () => {
        mount({
            kind: 'act',
            value: 'ACT 3',
            startEditing: true,
        });

        const field = await waitFor<HTMLElement>('[role="textbox"]');

        await expect.poll(() => document.activeElement).toBe(field);
        expect(window.getSelection()?.toString()).toBe('ACT 3');
    });
});
