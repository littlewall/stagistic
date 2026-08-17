import '../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ScriptEditorAppHeader} from './AppHeader';

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

const mountHeader = () => {
    const host = document.createElement('div');
    const actions: string[] = [];

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ScriptEditorAppHeader
            currentScript={{id: 'script-1', name: 'One Small Light'}}
            onHome={() => {}}
            activeView="editor"
            onSelectView={() => {}}
            onMenuAction={action => actions.push(action)}
            onRenameScript={() => {}}
        />,
    );

    return {actions};
};

const mountHeaderWithName = (name: string) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ScriptEditorAppHeader
            currentScript={{id: 'script-1', name}}
            onHome={() => {}}
            activeView="editor"
            onSelectView={() => {}}
            onRenameScript={() => {}}
            scriptSyncState="saving"
        />,
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('ScriptEditorAppHeader', () => {
    it('shows script identity separately from its direct actions', async () => {
        mountHeader();

        await waitForElement('input[aria-label="Script name"]');

        expect(document.querySelector('button[aria-label="Open script settings"]')).not.toBeNull();
        expect(document.querySelector('button[aria-label="Open attribute manager"]')).not.toBeNull();
        expect(document.querySelector('button[aria-label="Download .stagistic file"]')).not.toBeNull();
        expect(document.querySelector('button[aria-haspopup="menu"]')).toBeNull();
    });

    it('keeps the sync status in a fixed lane directly after the truncated script title', async () => {
        mountHeaderWithName('A script title long enough to exceed the available header identity space');

        const identity = await waitForElement<HTMLElement>('[data-script-identity]');
        const title = await waitForElement<HTMLInputElement>('input[aria-label="Script name"]');
        const status = await waitForElement<HTMLElement>('[data-sync-status]');
        const identityStyle = window.getComputedStyle(identity);
        const titleRect = title.getBoundingClientRect();
        const statusRect = status.getBoundingClientRect();

        expect(identityStyle.display).toBe('grid');
        expect(status.parentElement).toBe(identity);
        expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
        expect(statusRect.left - titleRect.right).toBeLessThanOrEqual(8);
        expect(statusRect.width).toBeGreaterThanOrEqual(20);
    });

    it('dispatches each script action directly', async () => {
        const {actions} = mountHeader();

        await userEvent.click(await waitForElement('button[aria-label="Open script settings"]'));
        await userEvent.click(await waitForElement('button[aria-label="Open attribute manager"]'));
        await userEvent.click(await waitForElement('button[aria-label="Download .stagistic file"]'));

        expect(actions).toEqual([
            'settings',
            'attributes',
            'export-stagistic',
        ]);
    });

    it('commits a single-line rename and leaves Tab navigation intact', async () => {
        const onRenameScript = vi.fn();
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <ScriptEditorAppHeader
                currentScript={{id: 'script-1', name: 'One Small Light'}}
                onHome={() => {}}
                activeView="editor"
                onSelectView={() => {}}
                onRenameScript={onRenameScript}
            />,
        );

        const input = await waitForElement<HTMLInputElement>('input[aria-label="Script name"]');

        await userEvent.click(input);
        await userEvent.keyboard('Second{Enter}');

        expect(onRenameScript).toHaveBeenCalledWith('Second');

        await userEvent.click(input);
        await userEvent.keyboard('Discarded{Escape}');

        expect(onRenameScript).toHaveBeenCalledTimes(1);

        await userEvent.click(input);
        await userEvent.keyboard('{Tab}');

        expect(document.activeElement).not.toBe(input);
    });
});
