import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {SIDEBAR_LAYOUT_STORAGE_KEY} from '../../../../storageKeys';
import {useSidebarLayout} from './useSidebarLayout';

const roots: Root[] = [];

const installMatchMedia = (width: number) => {
    vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
        const maxWidth = Number(query.match(/max-width:\s*(\d+)px/)?.[1]);

        return {
            matches: Number.isFinite(maxWidth) && width <= maxWidth,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        };
    });
};

const SidebarProbe = ({storageScope = 'script-1'}: {storageScope?: string}) => {
    const options = {
        availablePanelIds: ['structure', 'characters'],
        defaultLeftPanelId: 'structure',
        defaultRightPanelId: 'characters',
        storageScope,
    } as const;
    const layout = useSidebarLayout(options);

    return (
        <>
            <button type="button" onClick={layout.toggleLeft}>Left</button>
            <button type="button" onClick={layout.toggleRight}>Right</button>
            <output data-testid="sidebar-state">
                {`${layout.isLeftOpen}:${layout.isRightOpen}`}
            </output>
        </>
    );
};

const mount = (storageScope?: string) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(<SidebarProbe storageScope={storageScope} />);
    roots.push(root);

    return root;
};

const readState = () => document.querySelector('[data-testid="sidebar-state"]')?.textContent;

const openBoth = async () => {
    await expect.poll(() => document.querySelectorAll('button').length).toBe(2);

    if (readState()?.startsWith('true')) {
        await userEvent.click(document.querySelector('button')!);
    }

    if (readState()?.endsWith('true')) {
        await userEvent.click(document.querySelectorAll('button')[1]);
    }

    await userEvent.click(document.querySelector('button')!);
    await userEvent.click(document.querySelectorAll('button')[1]);
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    window.localStorage.removeItem(SIDEBAR_LAYOUT_STORAGE_KEY);
    window.localStorage.removeItem(`${SIDEBAR_LAYOUT_STORAGE_KEY}:script-1`);
    window.localStorage.removeItem(`${SIDEBAR_LAYOUT_STORAGE_KEY}:script-2`);
    vi.unstubAllGlobals();
});

describe('useSidebarLayout viewport contract', () => {
    it('opens both sidebars by default on a wide viewport', async () => {
        installMatchMedia(1470);
        mount();

        await expect.poll(readState).toBe('true:true');
    });

    it('keeps only the last-opened sidebar at 1469 px', async () => {
        installMatchMedia(1469);
        mount();

        await openBoth();

        await expect.poll(readState).toBe('false:true');
    });

    it('allows both sidebars at 1470 px', async () => {
        installMatchMedia(1470);
        mount();

        await openBoth();

        await expect.poll(readState).toBe('true:true');
    });

    it('keeps both drawers closed on arrival at 1199 px', async () => {
        installMatchMedia(1199);
        mount();

        await expect.poll(readState).toBe('false:false');
    });

    it('keeps both drawers closed at 1199 px even when the stored layout had them open', async () => {
        window.localStorage.setItem(
            `${SIDEBAR_LAYOUT_STORAGE_KEY}:script-1`,
            JSON.stringify({isLeftOpen: true, isRightOpen: true}),
        );
        installMatchMedia(1199);
        mount();

        await expect.poll(readState).toBe('false:false');
    });

    it('opens one drawer at a time at 1199 px', async () => {
        installMatchMedia(1199);
        mount();

        await expect.poll(() => document.querySelectorAll('button').length).toBe(2);
        await userEvent.click(document.querySelectorAll('button')[1]);
        await expect.poll(readState).toBe('false:true');

        await userEvent.click(document.querySelector('button')!);
        await expect.poll(readState).toBe('true:false');
    });

    it('closes an open drawer when its own toggle is pressed again', async () => {
        installMatchMedia(1199);
        mount();

        await expect.poll(() => document.querySelectorAll('button').length).toBe(2);
        await userEvent.click(document.querySelectorAll('button')[1]);
        await expect.poll(readState).toBe('false:true');

        await userEvent.click(document.querySelectorAll('button')[1]);
        await expect.poll(readState).toBe('false:false');
    });

    it('does not persist drawer state opened at 1199 px', async () => {
        installMatchMedia(1199);
        mount();

        await expect.poll(() => document.querySelectorAll('button').length).toBe(2);
        await userEvent.click(document.querySelectorAll('button')[1]);
        await expect.poll(readState).toBe('false:true');

        const stored: unknown = JSON.parse(
            window.localStorage.getItem(`${SIDEBAR_LAYOUT_STORAGE_KEY}:script-1`) ?? '{}',
        );

        expect(stored).toMatchObject({isLeftOpen: true, isRightOpen: true});
    });

    it('still docks a sidebar at 1200 px, just above the overlay breakpoint', async () => {
        installMatchMedia(1200);
        mount();

        await expect.poll(readState).toBe('false:true');
    });

    it('keeps sidebar state separate for each script', async () => {
        installMatchMedia(1470);
        const firstRoot = mount('script-1');

        await expect.poll(readState).toBe('true:true');
        await userEvent.click(document.querySelector('button')!);
        await expect.poll(readState).toBe('false:true');
        await expect.poll(() => window.localStorage.getItem(`${SIDEBAR_LAYOUT_STORAGE_KEY}:script-1`))
            .not.toBeNull();

        firstRoot.render(<SidebarProbe storageScope="script-2" />);

        await expect.poll(readState).toBe('true:true');
    });
});
