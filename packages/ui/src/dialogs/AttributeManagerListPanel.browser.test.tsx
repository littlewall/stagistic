import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {
    type AttributeManagerListItem,
    AttributeManagerListPanel,
} from './AttributeManagerListPanel';

const mountedRoots: Root[] = [];

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const renderPanel = (
    items: AttributeManagerListItem[],
    initialSelectedItemId?: string,
) => {
    const host = document.createElement('div');

    host.style.width = '900px';
    host.style.height = '600px';
    host.style.setProperty('--size-scale', '1');
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <AttributeManagerListPanel
            items={items}
            initialSelectedItemId={initialSelectedItemId}
            detailTypeLabel="Scene"
            emptyListLabel="No scenes yet"
            emptyDetailLabel="Select a scene"
            detailPlaceholder="Scene details are coming soon."
        />,
    );
    mountedRoots.push(root);

    return host;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AttributeManagerListPanel', () => {
    it('lists items and opens a placeholder detail on click', async () => {
        const host = renderPanel([
            {
                id: 's1', number: '1.', title: 'Opening',
            }, {
                id: 's2', number: '2.', title: 'The reveal',
            },
        ]);

        await waitForElement('[aria-label="Scene list"]');

        const buttons = Array.from(host.querySelectorAll('[aria-label="Scene list"] button'));

        expect(buttons.map(button => button.textContent)).toEqual(['1.Opening', '2.The reveal']);

        const secondItem = page.elementLocator(buttons[1] as HTMLButtonElement);

        await secondItem.click();

        const detail = await waitForElement('[aria-label="Scene detail"]');

        expect(detail.textContent).toContain('The reveal');
        expect(detail.textContent).toContain('Scene details are coming soon.');
    });

    it('shows the empty state when there are no items', async () => {
        renderPanel([]);

        const list = await waitForElement('[aria-label="Scene list"]');

        expect(list.textContent).toContain('No scenes yet');

        const detail = await waitForElement('[aria-label="Scene detail"]');

        expect(detail.textContent).toContain('Select a scene');
    });

    it('opens the requested item detail initially', async () => {
        renderPanel([
            {
                id: 'c1', number: '1.', title: 'Opening',
            }, {
                id: 'c2', number: '2.', title: 'Finale',
            },
        ], 'c2');

        const detail = await waitForElement('[aria-label="Scene detail"]');

        expect(detail.textContent).toContain('Finale');
        expect(document.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.textContent)
            .toContain('Finale');
    });

    it('places the number before the title and the icon after it', async () => {
        const host = renderPanel([
            {
                id: 'c1',
                number: '1.',
                title: 'Overture',
                icon: <span>Music kind</span>,
            },
        ]);

        const button = await waitForElement<HTMLButtonElement>('[aria-label="Scene list"] button');

        expect(Array.from(button.children).map(child => child.textContent)).toEqual([
            '1.',
            'Overture',
            'Music kind',
        ]);
        expect(host.contains(button)).toBe(true);
    });

    it('renders non-interactive group headings above their scenes', async () => {
        const host = renderPanel([
            {
                id: 's1',
                number: '1.',
                title: 'Opening',
                group: {id: 'act-1', label: 'Act I'},
            }, {
                id: 's2',
                number: '2.',
                title: 'Finale',
                group: {id: 'act-2', label: 'Act II'},
            },
        ]);

        await waitForElement('h4');

        const headings = Array.from(host.querySelectorAll('h4'));
        const buttons = Array.from(host.querySelectorAll('[aria-label="Scene list"] button'));

        expect(headings.map(heading => heading.textContent)).toEqual(['Act I', 'Act II']);
        expect(buttons.map(button => button.textContent)).toEqual(['1.Opening', '2.Finale']);
        expect(headings.every(heading => heading instanceof HTMLHeadingElement)).toBe(true);
    });
});
