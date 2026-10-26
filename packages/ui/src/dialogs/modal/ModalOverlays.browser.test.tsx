import '../../../styles/base.css';

import {requireValue} from '@stagistic/shared';
import {type ReactNode} from 'react';
import {MenuTrigger} from 'react-aria-components';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {Button} from '../../atoms/Button/Button';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {EditorSidebar} from '../../editor-panels/EditorSidebar';
import {DropdownMenu} from '../../molecules/DropdownMenu/DropdownMenu';
import {AttributeManagerModal} from '../attribute-manager/AttributeManagerModal';
import {ModalDialog} from './ModalDialog';

let root: Root | null = null;

const mount = async (children: ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(children);
    await expect.poll(() => host.querySelector('dialog[open]')).not.toBeNull();

    return requireValue(host.querySelector<HTMLDialogElement>('dialog[open]'));
};

const find = async (selector: string) => {
    await expect.poll(() => document.querySelector(selector)).not.toBeNull();

    return requireValue(document.querySelector<HTMLElement>(selector));
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('React Aria overlays in native dialogs', () => {
    it('keeps a menu inside the dialog top layer and lets its action run', async () => {
        const onAction = vi.fn();
        const dialog = await mount(
            <ModalDialog isOpen onClose={() => {}} ariaLabel="Actions">
                <MenuTrigger>
                    <Button>Open menu</Button>
                    <DropdownMenu aria-label="Actions" items={[{id: 'rename', label: 'Rename'}]} onAction={onAction} />
                </MenuTrigger>
            </ModalDialog>,
        );

        await userEvent.click(requireValue(dialog.querySelector('button')));

        const item = await find('[role="menuitem"]');

        expect(dialog.contains(item)).toBe(true);
        await userEvent.click(item);
        expect(onAction).toHaveBeenCalledWith('rename', undefined);
        await userEvent.click(requireValue(dialog.querySelector('button')));
        await find('[role="menuitem"]');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => document.querySelector('[role="menuitem"]')).toBeNull();
        expect(dialog.open).toBe(true);
        await expect.poll(() => document.activeElement).toBe(dialog.querySelector('button'));
    });

    it('keeps tooltips within the same native dialog', async () => {
        const dialog = await mount(
            <ModalDialog isOpen onClose={() => {}} ariaLabel="Help">
                <Tooltip label="Helpful description"><button type="button">Help</button></Tooltip>
            </ModalDialog>,
        );

        await userEvent.hover(requireValue(dialog.querySelector('button')));

        const tooltip = await find('[role="tooltip"]');

        expect(dialog.contains(tooltip)).toBe(true);
    });

    it('applies a character color through the real native attribute manager', async () => {
        const onSetCharacterColor = vi.fn();
        const dialog = await mount(
            <AttributeManagerModal isOpen tabs={[{id: 'characters', label: 'Characters'}]} activeTabId="characters" onClose={() => {}} onSelectTab={() => {}}>
                <EditorSidebar
                    data={{
                        confirmedCharacters: [
                            {
                                id: 'anna',
                                key: 'ANNA',
                                color: '#8899aa',
                                isConfirmed: true,
                            },
                        ],
                        groups: [],
                        unconfirmedCharacters: [],
                        isLoading: false,
                    }}
                    actions={{onSetCharacterColor}}
                />
            </AttributeManagerModal>,
        );

        await userEvent.click(await find('[aria-label="Choose color for ANNA"]'));

        const picker = await find('[role="dialog"][aria-label="Color picker for ANNA"]');

        expect(dialog.contains(picker)).toBe(true);
        await userEvent.click(requireValue(picker.querySelector('[aria-label="Select preset color 1"]')));
        await userEvent.click(requireValue(Array.from(picker.querySelectorAll('button')).find(button => button.textContent === 'Apply')));
        expect(onSetCharacterColor).toHaveBeenCalledOnce();
        expect(dialog.open).toBe(true);
        await userEvent.click(await find('[aria-label="Choose color for ANNA"]'));
        await find('[role="dialog"][aria-label="Color picker for ANNA"]');
        await userEvent.keyboard('{Escape}');
        await expect.poll(() => document.querySelector('[role="dialog"][aria-label="Color picker for ANNA"]')).toBeNull();
        expect(dialog.open).toBe(true);
    });
});
