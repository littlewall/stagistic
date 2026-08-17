import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {AccountMenu} from './AccountMenu';

let mountedRoot: Root | null = null;

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

const mountMenu = async () => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(<AccountMenu themeMode="auto" onThemeChange={() => {}} />);

    return waitForElement<HTMLButtonElement>('button[aria-label="Appearance"]');
};

const openThemeControls = async () => {
    const trigger = await mountMenu();

    await userEvent.click(trigger);

    const track = await waitForElement<HTMLElement>('[aria-label="Theme mode"]');

    const button = (label: string) => {
        const found = track.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

        if (!found) {
            throw new Error(`Expected a ${label} button`);
        }

        return found;
    };

    return {
        track,
        light: button('Light theme'),
        system: button('System theme'),
    };
};

/* Transitions on the pills run for .12s, so styles are read once they settle. */
const settle = async () => {
    await new Promise(resolve => window.setTimeout(resolve, 200));
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('AccountMenu trigger', () => {
    /*
     * The button used to be a cog labelled `Open settings` while the popover held
     * nothing but the theme switch, so anyone hunting for page format or the title
     * page clicked here and concluded the app had none.
     */
    it('is labelled after what the popover actually contains', async () => {
        await mountMenu();

        expect(document.querySelector('button[aria-label="Open settings"]')).toBeNull();
    });

    /*
     * `Tooltip` wraps the button in a second react-aria trigger. Both providers
     * hand props to the same `Button`, so this guards that the menu still opens
     * rather than the tooltip quietly swallowing the press.
     */
    it('still opens the popover once wrapped in a tooltip', async () => {
        const trigger = await mountMenu();

        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        await userEvent.click(trigger);
        await waitForElement('[aria-label="Theme mode"]');

        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('names the button on hover as well', async () => {
        const trigger = await mountMenu();

        await userEvent.hover(trigger);

        const tooltip = await waitForElement('[role="tooltip"]');

        expect(tooltip.textContent).toBe('Appearance');
    });
});

describe('theme mode toggle', () => {
    /*
     * The hover fill used to be `--state-hover`, which is the very same
     * `color-mix(surface-raised 70%, transparent)` the track is painted with, so
     * pointing at a mode produced a repaint nobody could see. Hover has to differ
     * from whatever it sits on, not merely be defined.
     */
    it('gives an inactive mode a hover fill distinct from the track', async () => {
        const {track, light} = await openThemeControls();

        await userEvent.hover(light);
        await settle();

        const hovered = getComputedStyle(light).backgroundColor;

        expect(hovered).not.toBe(getComputedStyle(track).backgroundColor);
        expect(hovered).not.toBe('rgba(0, 0, 0, 0)');
    });

    /* The chosen mode had no hover of its own, so it alone felt dead to the pointer. */
    it('also answers a hover over the active mode', async () => {
        const {system} = await openThemeControls();

        const resting = getComputedStyle(system).backgroundColor;

        await userEvent.hover(system);
        await settle();

        expect(getComputedStyle(system).backgroundColor).not.toBe(resting);
    });

    /*
     * Popover, track and active pill each drew a border, stacking three of them
     * within ~40px. The active pill now reads through tone alone.
     */
    it('marks the active mode without a third border', async () => {
        const {track, system, light} = await openThemeControls();

        await settle();

        const active = getComputedStyle(system);

        expect(active.borderTopColor).toBe(getComputedStyle(light).borderTopColor);
        expect(active.backgroundColor).not.toBe(getComputedStyle(track).backgroundColor);
        expect(active.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
});
