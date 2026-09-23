import '../../styles/tokens.css';

import {createRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
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

const mount = async (control: ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(control);

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

    it('focuses the search input when its empty-state icon is clicked', async () => {
        const input = await mountSearchControl();
        const searchLabel = await waitForElement<HTMLLabelElement>('label[aria-label="Focus search"]');

        await userEvent.click(searchLabel);

        expect(document.activeElement).toBe(input);
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

    it('uses a flat bordered surface while the input is active', async () => {
        const input = await mountSearchControl();

        await userEvent.click(input);

        const control = await waitForElement<HTMLElement>('[data-search-control]');
        const style = getComputedStyle(control);

        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(style.borderTopWidth).toBe('1px');
        expect(style.boxShadow).toBe('none');
    });

    it('forwards the search input ref', async () => {
        const ref = createRef<HTMLInputElement>();

        await mount(<SearchControl ref={ref} value="light" currentResult={1} resultCount={2} aria-label="Search script" readOnly />);

        expect(ref.current).toBe(document.querySelector('input[aria-label="Search script"]'));
    });

    it('announces a non-empty result position politely', async () => {
        await mount(<SearchControl value="light" currentResult={1} resultCount={2} aria-label="Search script" readOnly />);

        const output = document.querySelector('output[aria-label="Search result position"]');

        expect(output?.getAttribute('aria-live')).toBe('polite');
        expect(output?.getAttribute('aria-atomic')).toBe('true');
        expect(output?.textContent).toBe('1 / 2');
    });

    it('leaves Enter behavior to the supplied input handler', async () => {
        const onKeyDown = vi.fn();
        const input = await mount(<SearchControl value="light" currentResult={1} resultCount={2} aria-label="Search script" onKeyDown={onKeyDown} readOnly />);

        input.focus();
        await userEvent.keyboard('{Enter}');

        expect(onKeyDown).toHaveBeenCalledOnce();
    });

    it('forwards composing Enter without invoking navigation callbacks', async () => {
        const onKeyDown = vi.fn();
        const onNextResult = vi.fn();
        const input = await mount(
            <SearchControl
                value="light"
                currentResult={1}
                resultCount={2}
                aria-label="Search script"
                onKeyDown={onKeyDown}
                onNextResult={onNextResult}
                readOnly
            />,
        );

        input.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Enter',
                isComposing: true,
                bubbles: true,
            }),
        );

        expect(onKeyDown).toHaveBeenCalledOnce();
        const [event] = onKeyDown.mock.calls[0] as [ReactKeyboardEvent<HTMLInputElement>];

        expect(event.nativeEvent.isComposing).toBe(true);
        expect(onNextResult).not.toHaveBeenCalled();
    });
});
