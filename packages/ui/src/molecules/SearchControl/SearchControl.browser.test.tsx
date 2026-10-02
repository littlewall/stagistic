import '../../../styles/tokens.css';

import {
    createRef,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
    useState,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {SearchControl, type SearchControlReplace} from './SearchControl';

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
    mountedRoot.render(
        <SearchControl
            value="night"
            currentResult={0}
            resultCount={0}
            aria-label="Search script"
            onClear={() => {}}
            readOnly
        />,
    );

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
        mountedRoot.render(
            <SearchControl
                className="toolbar-position"
                value=""
                currentResult={0}
                resultCount={0}
                aria-label="Search script"
                readOnly
            />,
        );

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

        const control = await waitForElement<HTMLElement>('[data-search-surface]');
        const style = getComputedStyle(control);

        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(style.borderTopWidth).toBe('1px');
        expect(style.boxShadow).toBe('none');
    });

    it('forwards the search input ref', async () => {
        const ref = createRef<HTMLInputElement>();

        await mount(
            <SearchControl
                ref={ref}
                value="light"
                currentResult={1}
                resultCount={2}
                aria-label="Search script"
                readOnly
            />,
        );

        expect(ref.current).toBe(document.querySelector('input[aria-label="Search script"]'));
    });

    it('announces a non-empty result position politely', async () => {
        await mount(
            <SearchControl
                value="light"
                currentResult={1}
                resultCount={2}
                aria-label="Search script"
                readOnly
            />,
        );

        const output = document.querySelector('output[aria-label="Search result position"]');

        expect(output?.getAttribute('aria-live')).toBe('polite');
        expect(output?.getAttribute('aria-atomic')).toBe('true');
        expect(output?.textContent).toBe('1 / 2');
    });

    it('leaves Enter behavior to the supplied input handler', async () => {
        const onKeyDown = vi.fn();
        const input = await mount(
            <SearchControl
                value="light"
                currentResult={1}
                resultCount={2}
                aria-label="Search script"
                onKeyDown={onKeyDown}
                readOnly
            />,
        );

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

    it('hides case and replace affordances until handlers are supplied', async () => {
        await mountSearchControl();

        expect(document.querySelector('button[aria-label="Match case"]')).toBeNull();
        expect(document.querySelector('button[aria-label="Toggle replace"]')).toBeNull();
    });

    it('shows the result count and match case once the field is focused, before typing', async () => {
        const input = await mount(
            <SearchControl
                value=""
                currentResult={0}
                resultCount={0}
                aria-label="Search script"
                onCaseSensitiveChange={() => {}}
                readOnly
            />,
        );

        expect(document.querySelector('output[aria-label="Search result position"]')).toBeNull();
        expect(document.querySelector('button[aria-label="Match case"]')).toBeNull();

        await userEvent.click(input);

        const position = await waitForElement<HTMLOutputElement>('output[aria-label="Search result position"]');

        expect(position.textContent).toBe('0 / 0');
        expect(document.querySelector('button[aria-label="Match case"]')).not.toBeNull();

        input.blur();

        await waitForElement<HTMLLabelElement>('label[aria-label="Focus search"]');
        expect(document.querySelector('button[aria-label="Match case"]')).toBeNull();
    });

    it('toggles match case inside the search field', async () => {
        const onCaseSensitiveChange = vi.fn();

        await mount(
            <SearchControl
                value="light"
                currentResult={1}
                resultCount={2}
                aria-label="Search script"
                isCaseSensitive
                onCaseSensitiveChange={onCaseSensitiveChange}
                readOnly
            />,
        );

        const toggle = await waitForElement<HTMLButtonElement>('button[aria-label="Match case"]');

        expect(toggle.getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(toggle);

        expect(onCaseSensitiveChange).toHaveBeenCalledWith(false);
    });

    it('toggles match whole word inside the search field', async () => {
        const onWholeWordChange = vi.fn();

        await mount(
            <SearchControl
                value="light"
                currentResult={1}
                resultCount={2}
                aria-label="Search script"
                onWholeWordChange={onWholeWordChange}
                readOnly
            />,
        );

        const toggle = await waitForElement<HTMLButtonElement>('button[aria-label="Match whole word"]');

        expect(toggle.getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(toggle);

        expect(onWholeWordChange).toHaveBeenCalledWith(true);
    });
});

const ReplaceHarness = (props: Partial<SearchControlReplace>) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <SearchControl
            value="light"
            currentResult={1}
            resultCount={2}
            aria-label="Search script"
            readOnly
            shortcuts={{toggleReplace: '⌥⌘F', replaceAll: '⌘↩'}}
            replace={{
                isOpen,
                onOpenChange: setIsOpen,
                value: 'lamp',
                onChange: () => {},
                onReplace: () => {},
                onReplaceAll: () => {},
                ...props,
            }}
        />
    );
};

describe('SearchControl replace', () => {
    const openReplace = async (props: Partial<SearchControlReplace> = {}) => {
        const input = await mount(<ReplaceHarness {...props} />);
        const toggle = await waitForElement<HTMLButtonElement>('button[aria-label="Toggle replace"]');

        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(document.querySelector('input[aria-label="Replace with"]')).toBeNull();

        await userEvent.click(toggle);

        const replaceInput = await waitForElement<HTMLInputElement>('input[aria-label="Replace with"]');

        return {
            input,
            toggle,
            replaceInput,
        };
    };

    it('expands the same surface over the content below, keeping the toolbar footprint', async () => {
        const {
            input,
            toggle,
            replaceInput,
        } = await openReplace();
        const slot = await waitForElement<HTMLElement>('[data-search-control]');
        const surface = await waitForElement<HTMLElement>('[data-search-surface]');

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(document.getElementById(toggle.getAttribute('aria-controls')!)?.contains(replaceInput)).toBe(true);
        expect(surface.getBoundingClientRect().height).toBeGreaterThan(slot.getBoundingClientRect().height * 1.5);
        expect(replaceInput.getBoundingClientRect().top).toBeGreaterThanOrEqual(input.getBoundingClientRect().bottom);
        expect(Math.round(replaceInput.getBoundingClientRect().left)).toBe(Math.round(input.getBoundingClientRect().left));
        expect(toggle.getBoundingClientRect().height).toBeGreaterThan(input.getBoundingClientRect().height);
        expect(Number.parseFloat(getComputedStyle(input).paddingLeft)).toBeLessThanOrEqual(4);
        expect(Number.parseFloat(getComputedStyle(replaceInput).paddingLeft)).toBeLessThanOrEqual(4);

        await userEvent.click(toggle);

        expect(document.querySelector('input[aria-label="Replace with"]')).toBeNull();
    });

    it('names each action with its shortcut in a tooltip', async () => {
        const {toggle} = await openReplace();

        await userEvent.hover(await waitForElement<HTMLButtonElement>('button[aria-label="Replace all"]'));

        const replaceAllTooltip = await waitForElement<HTMLElement>('[role="tooltip"]');

        expect(replaceAllTooltip.textContent).toBe('Replace all⌘↩');

        await userEvent.hover(toggle);

        await waitForElement<HTMLElement>('[role="tooltip"]');
        expect([...document.querySelectorAll('[role="tooltip"]')].some(tooltip => tooltip.textContent === 'Hide replace⌥⌘F')).toBe(true);
    });

    it('collapses on Escape and returns focus to the search input', async () => {
        const {input, replaceInput} = await openReplace();

        replaceInput.focus();
        await userEvent.keyboard('{Escape}');

        expect(document.querySelector('input[aria-label="Replace with"]')).toBeNull();
        expect(document.activeElement).toBe(input);
    });

    it('replaces the current result on Enter and all results on Mod+Enter or the buttons', async () => {
        const onReplace = vi.fn();
        const onReplaceAll = vi.fn();
        const {replaceInput} = await openReplace({onReplace, onReplaceAll});

        replaceInput.focus();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await userEvent.click(await waitForElement<HTMLButtonElement>('button[aria-label="Replace"]'));
        await userEvent.click(await waitForElement<HTMLButtonElement>('button[aria-label="Replace all"]'));

        expect(onReplace).toHaveBeenCalledTimes(2);
        expect(onReplaceAll).toHaveBeenCalledTimes(2);
    });

    it('disables both actions and Enter without results', async () => {
        const onReplace = vi.fn();
        const {replaceInput} = await openReplace({onReplace, isDisabled: true});

        replaceInput.focus();
        await userEvent.keyboard('{Enter}');

        expect(onReplace).not.toHaveBeenCalled();
        expect(document.querySelector<HTMLButtonElement>('button[aria-label="Replace"]')?.disabled).toBe(true);
        expect(document.querySelector<HTMLButtonElement>('button[aria-label="Replace all"]')?.disabled).toBe(true);
    });
});
