import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import type {ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {SceneCard, type SceneCardProps} from './SceneCard';

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

const renderCard = (props: Partial<SceneCardProps> = {}, children?: ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <ul
            style={{
                width: '18rem',
                listStyle: 'none',
                margin: 0,
                padding: 0,
            }}
        >
            <SceneCard
                number={3}
                title="Kitchen, night"
                page={12}
                {...props}
            >
                {children}
            </SceneCard>
        </ul>,
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const text = (element: Element | null) => requireValue(element, 'element').textContent;

describe('SceneCard', () => {
    it('shows the scene number, title and start page', async () => {
        renderCard();

        const heading = await waitForElement<HTMLElement>('h3');

        expect(text(heading)).toBe('3. Kitchen, night');
        expect(document.body.textContent).toContain('p. 12');
    });

    it('shows a dash when the page is not measured', async () => {
        renderCard({page: null});
        await waitForElement('h3');

        expect(document.body.textContent).toContain('–');
        expect(document.body.textContent).not.toContain('p. ');
    });

    it('sets only the title in the script voice', async () => {
        renderCard();

        const heading = await waitForElement<HTMLElement>('h3');
        const spans = heading.querySelectorAll('span');

        expect(getComputedStyle(heading).fontFamily).toContain('IBM Plex Sans');
        expect(getComputedStyle(requireValue(spans[0], 'number')).fontFamily).toContain('IBM Plex Sans');
        expect(getComputedStyle(requireValue(spans[1], 'title')).fontFamily).toContain('Courier Prime');
    });

    it('renders its characters below the heading', async () => {
        renderCard({}, <span data-testid="chips">chips</span>);

        const chips = await waitForElement<HTMLElement>('[data-testid="chips"]');
        const heading = requireValue(document.querySelector('h3'), 'heading');

        expect(chips.getBoundingClientRect().top).toBeGreaterThan(heading.getBoundingClientRect().bottom - 1);
    });

    it('collapses to one line without page or characters', async () => {
        renderCard({variant: 'collapsed'}, <span data-testid="chips">chips</span>);

        const heading = await waitForElement<HTMLElement>('h3');

        expect(text(heading)).toBe('3. Kitchen, night');
        expect(document.querySelector('[data-testid="chips"]')).toBeNull();
        expect(document.body.textContent).not.toContain('p. 12');
        expect(requireValue(document.querySelector('li'), 'card').getBoundingClientRect().height).toBeLessThan(40);
    });

    it('reports the chosen menu action', async () => {
        const onAction = vi.fn<(id: string) => void>();

        renderCard({
            actions: {
                label: 'Scene 3 actions',
                items: [
                    {id: 'open', label: 'Open in Editor'},
                    {
                        id: 'delete',
                        label: 'Delete scene…',
                        tone: 'danger',
                    },
                ],
                onAction,
            },
        });
        await userEvent.click(await waitForElement('button[aria-label="Scene 3 actions"]'));

        const items = [...document.querySelectorAll('[role="menuitem"]')];

        expect(items.map(item => item.textContent)).toEqual(['Open in Editor', 'Delete scene…']);

        await userEvent.click(requireValue(items[0], 'open item'));

        expect(onAction).toHaveBeenCalledWith('open');
    });
});
