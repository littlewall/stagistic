import {
    type ComponentProps,
    type ComponentType,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {
    type AttributeManagerListItem,
    AttributeManagerListPanel,
} from './AttributeManagerListPanel';

const mountedRoots: Root[] = [];

type SearchableListPanelProps = ComponentProps<typeof AttributeManagerListPanel> & {
    search?: {
        ariaLabel: string,
        placeholder: string,
    },
    createAction?: {
        ariaLabel: string,
        tooltipLabel: string,
        onPress: () => void,
    },
    hideDetailTypeLabel?: boolean,
    wrapDetailTitle?: boolean,
};

const SearchableListPanel = AttributeManagerListPanel as ComponentType<SearchableListPanelProps>;

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
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <AttributeManagerListPanel
            items={items}
            initialSelectedItemId={initialSelectedItemId}
            detailTypeLabel="Scene"
            emptyListLabel="No scenes yet"
            emptyDetailLabel="Select a scene"
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
    it('lists items and opens the selected detail on click', async () => {
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
    });

    it('shows the empty state when there are no items', async () => {
        renderPanel([]);

        const list = await waitForElement('[aria-label="Scene list"]');

        expect(list.textContent).toContain('No scenes yet');

        const detail = await waitForElement('[aria-label="Scene detail"]');

        expect(detail.textContent).toContain('Select a scene');
    });

    it('leaves the detail body empty when no fallback content is provided', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <AttributeManagerListPanel
                items={[
                    {
                        id: 's1',
                        number: '1.',
                        title: 'Opening',
                    },
                ]}
                initialSelectedItemId="s1"
                detailTypeLabel="Scene"
                emptyListLabel="No scenes yet"
                emptyDetailLabel="Select a scene"
            />,
        );
        mountedRoots.push(root);

        const detail = await waitForElement('[aria-label="Scene detail"]');
        const detailBody = detail.lastElementChild;

        expect(detailBody?.childElementCount).toBe(0);
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

    it('does not reserve a number column for unnumbered items', async () => {
        renderPanel([
            {
                id: 'c1',
                number: '',
                title: 'Unassigned overture',
                icon: <span>Music kind</span>,
            },
        ]);

        const button = await waitForElement<HTMLButtonElement>('[aria-label="Scene list"] button');

        expect(Array.from(button.children).map(child => child.textContent)).toEqual(['Unassigned overture', 'Music kind']);
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

        /*
         * Located by text rather than by tag: querying 'h4' and then asserting
         * the results are headings is circular, and would keep passing if the
         * group labels regressed to plain elements.
         */
        const labelElements = Array.from(host.querySelectorAll<HTMLElement>('*'))
            .filter(element => element.childElementCount === 0
                && (element.textContent === 'Act I' || element.textContent === 'Act II'));

        expect(headings.map(heading => heading.textContent)).toEqual(['Act I', 'Act II']);
        expect(buttons.map(button => button.textContent)).toEqual(['1.Opening', '2.Finale']);
        expect(labelElements.map(element => element.tagName)).toEqual(['H4', 'H4']);
    });

    it('filters titled items and invokes the optional create action', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const onCreate = vi.fn();

        host.style.setProperty('--color-text', 'rgb(10, 20, 30)');
        host.style.setProperty('--color-text-muted', 'transparent');
        document.body.appendChild(host);
        root.render(
            <SearchableListPanel
                items={[
                    {
                        id: 'm1', number: '1.', title: 'Overture',
                    }, {
                        id: 'm2', number: '', title: 'Finale',
                    },
                ]}
                detailTypeLabel="Music"
                emptyListLabel="No music yet"
                emptyDetailLabel="Select music"
                search={{ariaLabel: 'Search music', placeholder: 'Search music'}}
                createAction={{
                    ariaLabel: 'Create music',
                    tooltipLabel: 'Create music',
                    onPress: onCreate,
                }}
            />,
        );
        mountedRoots.push(root);

        const searchInput = await waitForElement<HTMLInputElement>('[aria-label="Search music"]');

        await page.elementLocator(searchInput).fill('final');

        const list = await waitForElement('[aria-label="Music list"]');

        expect(list.textContent).toContain('Finale');
        expect(list.textContent).not.toContain('Overture');

        const addButton = await waitForElement<HTMLButtonElement>('[aria-label="Create music"]');
        const addIcon = addButton.querySelector('svg');

        expect(addIcon).not.toBeNull();
        expect(addIcon?.getBoundingClientRect().width).toBeGreaterThan(0);
        expect(getComputedStyle(addIcon as SVGElement).color).toBe('rgb(10, 20, 30)');

        await page.elementLocator(addButton).click();

        expect(onCreate).toHaveBeenCalledOnce();
    });

    it('shows a wrapping detail subtitle without a type label', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const items: Array<AttributeManagerListItem & {detailSubtitle: string}> = [
            {
                id: 'm1',
                number: '1.A)',
                title: 'A very long music title that must remain readable',
                detailSubtitle: '12. A very long scene title that must remain readable',
            },
        ];

        document.body.appendChild(host);
        root.render(
            <SearchableListPanel
                items={items}
                detailTypeLabel="Music"
                hideDetailTypeLabel
                wrapDetailTitle
                emptyListLabel="No music yet"
                emptyDetailLabel="Select music"
            />,
        );
        mountedRoots.push(root);

        const detail = await waitForElement('[aria-label="Music detail"]');
        const heading = detail.querySelector('h3');

        expect(detail.querySelector('header')?.textContent).not.toContain('Music');
        expect(detail.querySelector('header')?.textContent).toContain(items[0]?.detailSubtitle);
        expect(getComputedStyle(heading as HTMLHeadingElement).whiteSpace).toBe('normal');
    });
});
