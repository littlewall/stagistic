import '../../../styles/tokens.css';

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

import {ScriptStateMenu, type ScriptStateMenuProps} from './ScriptStateMenu';

let root: Root | null = null;

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

const menuTexts = () => [...document.querySelectorAll('[role="menu"] [role="menuitem"], [role="menu"] header')].map(element => element.textContent);

const renderMenu = (props: Partial<ScriptStateMenuProps> = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ScriptStateMenu
            label="Current"
            selectedId={null}
            versions={[
                {
                    id: 'v1',
                    label: 'Festival',
                    detail: 'sent to Avignon',
                },
            ]}
            drafts={[
                {id: 'd2', label: 'Draft 2'},
                {
                    id: 'd1',
                    label: 'Draft 1',
                    detail: 'first pass',
                },
            ]}
            onSelect={vi.fn()}
            {...props}
        />,
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const openActions = async () => {
    await userEvent.click(await waitForElement('button[aria-label="Script state actions"]'));
    await waitForElement('[role="menu"]');
};

describe('ScriptStateMenu', () => {
    it('lists the current script, versions and drafts in the state menu only', async () => {
        renderMenu({
            onSaveDraft: vi.fn(),
            onSaveVersion: vi.fn(),
            onManage: vi.fn(),
        });

        await userEvent.click(await waitForElement('[aria-label="Script state: Current"]'));
        await waitForElement('[role="menu"]');

        expect(menuTexts()).toEqual([
            'Current✓',
            'Versions',
            'Festivalsent to Avignon',
            'Drafts',
            'Draft 2',
            'Draft 1first pass',
        ]);
    });

    it('offers saving and managing behind the chevron for the current script', async () => {
        const onSaveDraft = vi.fn();

        renderMenu({
            onSaveDraft,
            onSaveVersion: vi.fn(),
            onManage: vi.fn(),
        });

        expect((await waitForElement('[aria-label="Script state: Current"]')).querySelector('svg')).toBeNull();

        await openActions();

        expect(menuTexts()).toEqual([
            'Save as new draft',
            'Save as version',
            'Manage drafts and versions',
        ]);

        await userEvent.click(requireValue([...document.querySelectorAll('[role="menuitem"]')].find(item => item.textContent === 'Save as new draft')));

        expect(onSaveDraft).toHaveBeenCalledOnce();
    });

    it('reports the chosen state and the current script', async () => {
        const onSelect = vi.fn();

        renderMenu({
            label: 'Draft 1',
            selectedId: 'd1',
            onSelect,
        });

        await userEvent.click(await waitForElement('[aria-label="Script state: Draft 1"]'));
        await userEvent.click(requireValue([...document.querySelectorAll('[role="menuitem"]')].find(item => item.textContent?.startsWith('Festival'))));

        expect(onSelect).toHaveBeenLastCalledWith('v1');

        await userEvent.click(await waitForElement('[aria-label="Script state: Draft 1"]'));
        await userEvent.click(requireValue([...document.querySelectorAll('[role="menuitem"]')].find(item => item.textContent?.startsWith('Current'))));

        expect(onSelect).toHaveBeenLastCalledWith(null);
    });

    it('marks a stored state with a lock and offers restore instead of saving', async () => {
        const onRestore = vi.fn();
        const onRestoreAsNew = vi.fn();

        renderMenu({
            label: 'Draft 1',
            selectedId: 'd1',
            onManage: vi.fn(),
            restore: {onRestore, onRestoreAsNew},
        });

        const trigger = await waitForElement('[aria-label="Script state: Draft 1"]');

        expect(trigger.querySelector('svg')).not.toBeNull();

        await openActions();

        expect(menuTexts()).toEqual([
            'Restore to this script',
            'Restore as new script',
            'Manage drafts and versions',
        ]);

        await userEvent.click(requireValue([...document.querySelectorAll('[role="menuitem"]')].find(item => item.textContent === 'Restore as new script')));

        expect(onRestoreAsNew).toHaveBeenCalledOnce();
        expect(onRestore).not.toHaveBeenCalled();
    });
});
