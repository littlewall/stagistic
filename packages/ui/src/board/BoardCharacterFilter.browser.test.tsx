import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {FocusVisibilityManager} from '../layout/FocusVisibilityManager';
import {BoardCharacterFilter, type BoardFilterCharacter} from './BoardCharacterFilter';

let root: Root | null = null;

const waitFor = async <T,>(read: () => T | null | undefined | false): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

const character = (name: string, sceneCount = 2): BoardFilterCharacter => ({
    id: name.toLowerCase(),
    name,
    color: '#cc3344',
    sceneCount,
});

const CAST = [
    character('ANNA', 3),
    character('BEN', 1),
    character('CLARA', 0),
    character('DOCTOR'),
    character('EVE'),
    character('FRED'),
    character('GINA'),
    character('HUGO'),
];

const renderFilter = (selectedIds: string[], onChange = vi.fn<(ids: string[]) => void>(), characters = CAST) => {
    const host = document.createElement('div');

    host.style.width = '600px';
    document.body.appendChild(host);
    root = createRoot(host);

    const Harness = () => {
        const [ids, setIds] = useState(selectedIds);

        return (
            <>
                <FocusVisibilityManager />
                <BoardCharacterFilter
                    characters={characters}
                    selectedIds={ids}
                    onChange={next => {
                        onChange(next);
                        setIds(next);
                    }}
                />
            </>
        );
    };

    root.render(<Harness />);

    return onChange;
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const findTrigger = () => document.querySelector<HTMLElement>('button[aria-expanded]');
const trigger = () => requireValue(findTrigger(), 'trigger');
const clearButton = () => document.querySelector<HTMLElement>('button[aria-label="Clear character filter"]');
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const rows = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"] li')];
const dotsIn = (element: Element) => element.querySelectorAll('[class*="stack"] > span');

const openPanel = async () => {
    await userEvent.click(await waitFor(findTrigger));
    await waitFor(dialog);
};

describe('BoardCharacterFilter trigger', () => {
    it('reads "Characters" with nothing chosen, and offers no clear button', async () => {
        renderFilter([]);
        await waitFor(findTrigger);

        expect(trigger().textContent?.trim()).toBe('Characters');
        expect(clearButton()).toBeNull();
    });

    it('shows the one chosen character as a dot and a name, in the chosen state', async () => {
        renderFilter(['anna']);
        await waitFor(findTrigger);

        expect(trigger().textContent?.trim()).toBe('ANNA');
        expect(trigger().getAttribute('aria-label')).toBe('Characters: ANNA');
        expect(trigger().children.length).toBeGreaterThan(1);
        expect(getComputedStyle(requireValue(trigger().parentElement, 'group')).borderTopColor).not.toBe(getComputedStyle(document.body).borderTopColor);
    });

    it('draws the clear button inside the control, between the label and the caret, as its own button', async () => {
        renderFilter(['anna']);
        await waitFor(clearButton);

        const control = requireValue(trigger().parentElement, 'control').getBoundingClientRect();
        const clear = requireValue(clearButton(), 'clear').getBoundingClientRect();
        const caret = requireValue(trigger().querySelector('svg'), 'caret').getBoundingClientRect();
        const label = requireValue(trigger().querySelector('span:not([aria-hidden])'), 'label').getBoundingClientRect();

        expect(trigger().contains(clearButton())).toBe(false);
        expect(clear.left).toBeGreaterThanOrEqual(label.right - 1);
        expect(clear.right).toBeLessThanOrEqual(caret.left + 1);
        expect(clear.right).toBeLessThanOrEqual(control.right);
        expect(control.right - caret.right).toBeLessThanOrEqual(10);
    });

    it('tabs from the trigger to the clear button', async () => {
        renderFilter(['anna']);
        await waitFor(clearButton);
        await userEvent.tab();

        expect(document.activeElement).toBe(trigger());

        await userEvent.tab();

        expect(document.activeElement).toBe(clearButton());
    });

    it('shows overlapping dots and a count for several', async () => {
        renderFilter([
            'anna',
            'ben',
            'clara',
        ]);
        await waitFor(findTrigger);

        expect(trigger().textContent?.trim()).toBe('3 characters');
        expect(dotsIn(trigger())).toHaveLength(3);
    });

    it('caps the dots and stays within its width for eight characters', async () => {
        renderFilter(CAST.map(entry => entry.id));
        await waitFor(findTrigger);

        expect(trigger().textContent?.trim()).toBe('8 characters');
        expect(dotsIn(trigger())).toHaveLength(5);
        expect(trigger().scrollWidth).toBeLessThanOrEqual(trigger().clientWidth);
        expect(trigger().getBoundingClientRect().width).toBeLessThanOrEqual(256);
    });

    it('truncates a very long single name instead of overflowing', async () => {
        renderFilter(['long'], undefined, [{...character('LONG NAME THAT GOES ON AND ON FOREVER AND EVER'), id: 'long'}]);
        await waitFor(findTrigger);

        expect(trigger().getBoundingClientRect().width).toBeLessThanOrEqual(256);
    });

    it('clears the filter from a separate button without opening the panel', async () => {
        const onChange = renderFilter(['anna', 'ben']);

        await waitFor(clearButton);

        expect(trigger().contains(clearButton())).toBe(false);

        await userEvent.click(requireValue(clearButton(), 'clear'));

        expect(onChange).toHaveBeenCalledWith([]);
        expect(dialog()).toBeNull();
        expect(trigger().textContent?.trim()).toBe('Characters');
        expect(clearButton()).toBeNull();
        await waitFor(() => document.activeElement === trigger());
    });

    it('ignores a chosen id the list no longer has', async () => {
        renderFilter(['gone']);
        await waitFor(findTrigger);

        expect(trigger().textContent?.trim()).toBe('Characters');
        expect(clearButton()).toBeNull();
    });
});

describe('BoardCharacterFilter panel', () => {
    it('lists characters in the given order with scene counts and the chosen ones checked', async () => {
        renderFilter(['ben']);
        await openPanel();

        expect(rows().slice(0, 3).map(row => row.textContent)).toEqual([
            'ANNA3 scenes',
            'BEN1 scene',
            'CLARA0 scenes',
        ]);
        expect(rows().map(row => row.querySelector<HTMLInputElement>('input')?.checked).slice(0, 3)).toEqual([
            false,
            true,
            false,
        ]);
        expect(getComputedStyle(requireValue(rows()[1], 'row')).backgroundColor).not.toBe(getComputedStyle(requireValue(rows()[0], 'row')).backgroundColor);
    });

    it('finds characters by name', async () => {
        renderFilter([]);
        await openPanel();

        const search = requireValue(document.querySelector<HTMLInputElement>('input[type="search"]'), 'search');

        expect(search.getAttribute('aria-label')).toBe('Find character');
        expect(document.activeElement).toBe(search);

        await userEvent.keyboard('cla');

        expect(rows().map(row => row.textContent)).toEqual(['CLARA0 scenes']);

        await userEvent.clear(search);
        await userEvent.keyboard('zzz');

        expect(rows()).toHaveLength(0);
        expect(dialog()?.textContent).toContain('No characters match.');
    });

    it('adds and removes characters one by one', async () => {
        const onChange = renderFilter(['anna']);

        await openPanel();
        await userEvent.click(requireValue(rows()[1]?.querySelector('label'), 'ben'));

        expect(onChange).toHaveBeenLastCalledWith(['anna', 'ben']);

        await userEvent.click(requireValue(rows()[0]?.querySelector('label'), 'anna'));

        expect(onChange).toHaveBeenLastCalledWith(['ben']);
    });

    it('disables Clear filter without a choice and clears with one', async () => {
        const onChange = renderFilter(['anna']);

        await openPanel();

        const clear = requireValue([...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(item => item.textContent === 'Clear filter'), 'clear filter');

        expect(clear.disabled).toBe(false);

        await userEvent.click(clear);

        expect(onChange).toHaveBeenLastCalledWith([]);
        await waitFor(() => requireValue(document.querySelector<HTMLButtonElement>('[role="dialog"] button:last-of-type'), 'button').disabled);
    });

    it('works from the keyboard and returns focus to the trigger on Escape', async () => {
        const onChange = renderFilter([]);

        await waitFor(findTrigger);
        await userEvent.tab();

        expect(document.activeElement).toBe(trigger());

        await userEvent.keyboard('{Enter}');
        await waitFor(dialog);
        await userEvent.tab();

        expect(document.activeElement).toBe(rows()[0]?.querySelector('input'));

        await userEvent.keyboard(' ');

        expect(onChange).toHaveBeenLastCalledWith(['anna']);

        await userEvent.keyboard('{Escape}');
        await waitFor(() => dialog() === null);
        await waitFor(() => document.activeElement === trigger());

        expect(document.activeElement).toBe(trigger());
    });

    it('forgets the search when the panel closes', async () => {
        renderFilter([]);
        await openPanel();
        await userEvent.keyboard('ben');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => dialog() === null);
        await openPanel();

        expect(requireValue(document.querySelector<HTMLInputElement>('input[type="search"]'), 'search').value).toBe('');
        expect(rows()).toHaveLength(CAST.length);
    });
});
