import '../../styles/base.css';

import {requireValue} from '@stagistic/shared';
import {
    type ReactNode,
    useRef,
    useState,
} from 'react';
import {MenuTrigger} from 'react-aria-components';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {Button} from '../atoms/Button/Button';
import {Checkbox} from '../atoms/Checkbox/Checkbox';
import {Input} from '../atoms/Input/Input';
import {RadioChoiceGroup} from '../atoms/RadioChoiceGroup/RadioChoiceGroup';
import {Switch} from '../atoms/Switch/Switch';
import {ModalDialog} from '../dialogs/modal/ModalDialog';
import {DropdownMenu} from '../molecules/DropdownMenu/DropdownMenu';
import {MultiComboBox} from '../molecules/forms/MultiComboBox/MultiComboBox';
import comboStyles from '../molecules/forms/MultiComboBox/MultiComboBox.module.css';
import {SearchControl} from '../molecules/SearchControl/SearchControl';
import searchStyles from '../molecules/SearchControl/SearchControl.module.css';
import {AppLayout} from './AppLayout';
import {FocusVisibilityManager} from './FocusVisibilityManager';

let root: Root | null = null;

const mount = async (children: ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<><FocusVisibilityManager />{children}</>);
    await expect.poll(() => host.childElementCount).toBeGreaterThan(0);
    await new Promise(resolve => requestAnimationFrame(resolve));

    return host;
};

const outline = (element: Element) => getComputedStyle(element).outlineStyle;
const ModalHarness = () => {
    const [isOpen, setIsOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);

    return (
        <>
            <div contentEditable suppressContentEditableWarning>Scene text</div>
            <Button ref={trigger} variant="ghost" onPress={() => setIsOpen(true)}>Open dialog</Button>
            <ModalDialog returnFocus={trigger} isOpen={isOpen} onClose={() => setIsOpen(false)} ariaLabel="Edit scene">
                <form
                    onSubmit={event => {
                        event.preventDefault();
                        setIsOpen(false);
                    }}
                >
                    <Input aria-label="Scene title" />
                    <Button variant="ghost" type="submit">Close</Button>
                </form>
            </ModalDialog>
        </>
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('focus visibility across controls and overlays', () => {
    it('preserves keyboard visibility when activation replaces the route layout', async () => {
        const RouteHarness = () => {
            const [view, setView] = useState('home');

            return (
                <AppLayout key={view} footer={null}>
                    <Button onPress={() => setView('editor')}>{view}</Button>
                </AppLayout>
            );
        };
        const host = await mount(<RouteHarness />);

        await userEvent.tab();
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => host.querySelector('button')?.textContent).toBe('editor');

        const action = requireValue(host.querySelector('button'));

        action.focus();
        expect(outline(action)).toBe('solid');
    });

    it.each([
        'pointer',
        'Escape',
        'Enter',
    ])('keeps a pointer-opened dialog and its restored trigger ring-free after %s', async close => {
        const host = await mount(<ModalHarness />);
        const trigger = requireValue(host.querySelector('button'));

        await userEvent.click(requireValue(host.querySelector('[contenteditable]')));
        await userEvent.keyboard('draft');
        await userEvent.click(trigger);
        await expect.poll(() => host.querySelector('dialog[open]')).not.toBeNull();

        const input = requireValue(host.querySelector('input'));

        await expect.poll(() => document.activeElement).toBe(input);
        expect(outline(input)).toBe('none');
        await userEvent.keyboard('Scene one');

        if (close === 'pointer') {
            await userEvent.click(requireValue(host.querySelector('dialog button')));
        } else {
            await userEvent.keyboard(`{${close}}`);
        }

        await expect.poll(() => host.querySelector('dialog')).toBeNull();
        expect(document.activeElement).toBe(trigger);
        expect(outline(trigger)).toBe('none');
    });

    it('preserves keyboard rings after Tab within a dialog and Escape restoration', async () => {
        const host = await mount(<ModalHarness />);
        const trigger = requireValue(host.querySelector('button'));

        await userEvent.click(trigger);
        await expect.poll(() => host.querySelector('dialog[open]')).not.toBeNull();
        await userEvent.tab();
        expect(document.activeElement).toBe(host.querySelector('dialog button'));
        expect(outline(requireValue(document.activeElement))).toBe('solid');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => document.activeElement).toBe(trigger);
        expect(outline(trigger)).toBe('solid');
    });

    it('switches a pointer-opened RAC menu to keyboard indicators only on navigation', async () => {
        const host = await mount(
            <MenuTrigger>
                <Button variant="ghost">Actions</Button>
                <DropdownMenu aria-label="Scene actions" items={[{id: 'rename', label: 'Rename'}, {id: 'delete', label: 'Delete'}]} onAction={() => {}} />
            </MenuTrigger>,
        );
        const trigger = requireValue(host.querySelector('button'));

        await userEvent.click(trigger);
        await expect.poll(() => document.querySelectorAll('[role="menuitem"]').length).toBe(2);

        const items = document.querySelectorAll('[role="menuitem"]');

        expect(getComputedStyle(items[0]).backgroundColor).toBe('rgba(0, 0, 0, 0)');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => document.activeElement).toBe(trigger);
        expect(outline(trigger)).toBe('none');

        await userEvent.click(trigger);
        await userEvent.keyboard('{ArrowDown}');
        await expect.poll(() => document.querySelector('[role="menuitem"][data-focused]')).not.toBeNull();
        expect(getComputedStyle(requireValue(document.querySelector('[role="menuitem"][data-focused]'))).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => document.activeElement).toBe(trigger);
        expect(outline(trigger)).toBe('solid');
    });

    it.each([
        {
            name: 'checkbox',
            control: <Checkbox>Remember</Checkbox>,
            indicator: 'label > span[aria-hidden]',
        },
        {
            name: 'switch',
            control: <Switch>Enable</Switch>,
            indicator: 'label > span[aria-hidden]',
        },
        {
            name: 'radio',
            control: <RadioChoiceGroup ariaLabel="View" value="one" options={[{value: 'one', label: 'One'}]} onChange={() => {}} />,
            indicator: 'label',
        },
        {
            name: 'tag group',
            control: <MultiComboBox label="Places" placeholder="Select places" options={[]} value={[]} onChange={() => {}} />,
            indicator: `.${comboStyles.selected}`,
        },
        {
            name: 'search group',
            control: <SearchControl aria-label="Find" size="toolbar" currentResult={0} resultCount={0} />,
            indicator: `.${searchStyles.control}`,
        },
    ])('uses the shared signal for the $name indicator', async ({control, indicator}) => {
        const host = await mount(control);
        const target = requireValue(host.querySelector(indicator));

        await userEvent.tab();
        await expect.poll(() => outline(target)).toBe('solid');
        await userEvent.click(requireValue(host.querySelector('label') ?? host.querySelector('input')));
        await expect.poll(() => outline(target)).toBe('none');
    });
});
