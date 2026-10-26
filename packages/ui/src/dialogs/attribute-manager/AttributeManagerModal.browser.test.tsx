import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {ReadOnlyNotice} from '../../molecules/ReadOnlyNotice/ReadOnlyNotice';
import {AttributeManagerModal} from './AttributeManagerModal';

let root: Root | null = null;

const renderModal = async (notice?: boolean) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <AttributeManagerModal
            isOpen
            tabs={[{id: 'characters', label: 'Characters'}]}
            activeTabId="characters"
            notice={notice ? <ReadOnlyNotice label="Festival" /> : null}
            onClose={() => undefined}
            onSelectTab={() => undefined}
        />,
    );

    const deadline = Date.now() + 1000;

    while (!host.querySelector('dialog[open]') && Date.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    return host;
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('AttributeManagerModal', () => {
    it('places a read-only notice between the header and the tabs', async () => {
        const host = await renderModal(true);
        const dialog = host.querySelector('dialog[open] > div');
        const children = [...dialog?.children ?? []].map(element => element.tagName.toLowerCase());

        expect(children).toEqual([
            'header',
            'div',
            'nav',
            'section',
        ]);
        expect(dialog?.querySelector('[role="status"]')?.textContent).toBe('Festival · Read-only');
    });

    it('renders no notice strip for the current script', async () => {
        const host = await renderModal();

        expect(host.querySelector('[role="status"]')).toBeNull();
    });
});
