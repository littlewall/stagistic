import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {ATTRIBUTE_MANAGER_PANEL_STRUCTURE} from '../../attributes/attributeManagerMenu';
import {AttributeManagerSidebarButton} from './AttributeManagerSidebarButton';

const openAttributeManagerModalWithPanel = vi.fn();
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

vi.mock('../../settings/ScriptSettingsModalProvider', () => ({
    useScriptSettingsModal: () => ({openAttributeManagerModalWithPanel}),
}));

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
    openAttributeManagerModalWithPanel.mockReset();
});

describe('AttributeManagerSidebarButton', () => {
    it('names the scoped attribute-manager destination', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(<AttributeManagerSidebarButton panelId={ATTRIBUTE_MANAGER_PANEL_STRUCTURE} />);

        const button = await waitForElement<HTMLButtonElement>(
            'button[aria-label="Open structure in attribute manager"]',
        );

        expect(button).not.toBeNull();
    });
});
