import '../../styles/tokens.css';

import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {SearchControl} from './SearchControl';

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

const SearchControlHarness = () => {
    const [value, setValue] = useState('');

    return (
        <SearchControl
            value={value}
            currentResult={2}
            resultCount={7}
            aria-label="Search script"
            placeholder="Find in script"
            onChange={event => setValue(event.target.value)}
            onClear={() => setValue('')}
        />
    );
};

const mountSearchControl = async () => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(<SearchControlHarness />);

    return waitForElement<HTMLInputElement>('input[aria-label="Search script"]');
};

const mountEmptyResultControl = async () => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(<SearchControl value="night" currentResult={0} resultCount={0} aria-label="Search script" onClear={() => {}} readOnly />);

    await waitForElement<HTMLInputElement>('input[aria-label="Search script"]');
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('SearchControl', () => {
    it('keeps query text clear of the control edge', async () => {
        const input = await mountSearchControl();
        const paddingLeft = Number.parseFloat(getComputedStyle(input).paddingLeft);

        expect(paddingLeft).toBeGreaterThanOrEqual(12);
    });

    it('keeps the clear action light and clickable', async () => {
        const input = await mountSearchControl();

        await userEvent.type(input, 'night');

        const clearButton = document.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');

        expect(clearButton).not.toBeNull();

        if (!clearButton) {
            return;
        }

        expect(getComputedStyle(clearButton).cursor).toBe('pointer');
        expect(Number.parseFloat(getComputedStyle(clearButton.querySelector('svg')!).opacity)).toBeLessThanOrEqual(0.6);

        await userEvent.click(clearButton);

        expect(input.value).toBe('');
    });

    it('applies a positioning class to the control wrapper', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        mountedRoot = createRoot(host);
        mountedRoot.render(<SearchControl className="toolbar-position" value="" currentResult={0} resultCount={0} aria-label="Search script" readOnly />);

        const control = await waitForElement<HTMLElement>('[data-search-control]');

        expect(control.classList.contains('toolbar-position')).toBe(true);
    });

    it('replaces the search affordance with the result position after typing', async () => {
        const input = await mountSearchControl();

        expect(document.querySelector('output[aria-label="Search result position"]')).toBeNull();

        await userEvent.type(input, 'night');

        const position = await waitForElement<HTMLOutputElement>('output[aria-label="Search result position"]');

        expect(position.textContent).toBe('2 / 7');
    });

    it('disables result navigation when there are no matches', async () => {
        await mountEmptyResultControl();

        const previous = await waitForElement<HTMLButtonElement>('button[aria-label="Previous search result"]');
        const next = await waitForElement<HTMLButtonElement>('button[aria-label="Next search result"]');

        expect(previous.disabled).toBe(true);
        expect(next.disabled).toBe(true);
    });

    it('keeps the result indicator compact beside navigation', async () => {
        await mountEmptyResultControl();

        const position = await waitForElement<HTMLOutputElement>('output[aria-label="Search result position"]');

        expect(position.getBoundingClientRect().width).toBeLessThanOrEqual(32);
    });

    it('makes the result indicator quieter than the query text', async () => {
        await mountEmptyResultControl();

        const input = await waitForElement<HTMLInputElement>('input[aria-label="Search script"]');
        const position = await waitForElement<HTMLOutputElement>('output[aria-label="Search result position"]');

        expect(Number.parseFloat(getComputedStyle(position).fontSize)).toBeLessThanOrEqual(10);
        expect(Number.parseFloat(getComputedStyle(position).fontSize)).toBeLessThan(Number.parseFloat(getComputedStyle(input).fontSize));
    });

    it('separates query clearing from result controls with an inset divider', async () => {
        await mountEmptyResultControl();

        const control = await waitForElement<HTMLElement>('[data-search-control]');
        const divider = document.querySelector<HTMLElement>('[data-search-divider]');

        expect(divider).not.toBeNull();

        if (!divider) {
            return;
        }

        expect(divider.getBoundingClientRect().width).toBe(1);
        expect(divider.getBoundingClientRect().height).toBeLessThan(control.getBoundingClientRect().height);
    });

    it('opens an empty search options surface', async () => {
        await mountEmptyResultControl();

        const trigger = await waitForElement<HTMLButtonElement>('button[aria-label="Search options"]');

        await userEvent.click(trigger);

        const options = await waitForElement<HTMLElement>('[role="dialog"][aria-label="Search options"]');

        expect(options.textContent).toBe('');
    });

    it('renders search options as a padded floating surface', async () => {
        await mountEmptyResultControl();

        const trigger = await waitForElement<HTMLButtonElement>('button[aria-label="Search options"]');

        await userEvent.click(trigger);

        const popover = await waitForElement<HTMLElement>('[data-search-options-popover]');
        const style = getComputedStyle(popover);

        expect(style.padding).not.toBe('0px');
        expect(style.borderTopWidth).toBe('1px');
        expect(style.boxShadow).not.toBe('none');
    });

    it('matches the search options width to the search control', async () => {
        await mountEmptyResultControl();

        const trigger = await waitForElement<HTMLButtonElement>('button[aria-label="Search options"]');

        await userEvent.click(trigger);

        const control = await waitForElement<HTMLElement>('[data-search-control]');
        const popover = await waitForElement<HTMLElement>('[data-search-options-popover]');

        expect(popover.getBoundingClientRect().width).toBe(control.getBoundingClientRect().width);
    });

    it('uses a flat bordered surface while the input is active', async () => {
        const input = await mountSearchControl();

        await userEvent.click(input);

        const control = await waitForElement<HTMLElement>('[data-search-control]');
        const style = getComputedStyle(control);

        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(style.borderTopWidth).toBe('1px');
        expect(style.boxShadow).toBe('none');
    });
});
