import '@stagistic/ui/styles/base.css';

import {
    BASIC_DEFAULTS,
    type InitialPagesValue,
} from '@stagistic/export';
import {useState} from 'react';
import {
    createRoot,
    type Root,
} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {InitialPagesModule} from './InitialPagesModule';

const mountedRoots: Root[] = [];

const waitFor = async <Element extends HTMLElement>(
    query: () => Element | null,
): Promise<Element> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = query();

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Expected element to render.');
};

const findSwitch = (label: string) => Array
    .from(document.querySelectorAll<HTMLLabelElement>('label'))
    .find(element => element.textContent?.trim() === label) ?? null;

const checked = (element: HTMLLabelElement) => element.querySelector<HTMLInputElement>('input[role="switch"]')?.checked;

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('InitialPagesModule', () => {
    it('controls Characters and Places independently without redundant headings', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = () => {
            const [value, setValue] = useState<InitialPagesValue>({
                startEachInitialPageOnOddPage: BASIC_DEFAULTS.initialPages.startEachInitialPageOnOddPage,
                showPageNumbers: BASIC_DEFAULTS.initialPages.showPageNumbers,
                charactersAndPlaces: {
                    ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
                },
                contents: {
                    ...BASIC_DEFAULTS.initialPages.contents,
                },
            });
            const [blankPages, setBlankPages] = useState({
                betweenInitialPagesAndScript: {
                    ...BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript,
                },
            });

            return (
                <>
                    <InitialPagesModule
                        value={value}
                        blankPages={blankPages}
                        hasAutomaticBalancingBlank={false}
                        onChange={setValue}
                        onBlankPagesChange={setBlankPages}
                    />
                    <output data-testid="value">{JSON.stringify(value)}</output>
                </>
            );
        };

        document.body.appendChild(host);
        root.render(<Harness />);
        mountedRoots.push(root);

        const charactersSwitch = await waitFor(() => findSwitch('Characters'));
        const placesSwitch = await waitFor(() => findSwitch('Places'));
        const outlineSwitch = await waitFor(() => findSwitch('Show character outlines'));
        const oddPageSwitch = await waitFor(() => findSwitch('Start each initial page on an odd page'));
        const numberingSwitch = await waitFor(() => findSwitch('Show page numbers'));
        const orderSelect = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Order characters by"]'));
        const orderPrefix = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLSpanElement>('span'))
            .find(element => element.textContent?.trim() === 'Order characters by') ?? null);

        expect(checked(charactersSwitch)).toBe(true);
        expect(checked(placesSwitch)).toBe(true);
        expect(checked(outlineSwitch)).toBe(false);
        expect(checked(oddPageSwitch)).toBe(true);
        expect(checked(numberingSwitch)).toBe(true);
        expect(
            Array.from(document.querySelectorAll<HTMLLabelElement>('label')).indexOf(oddPageSwitch),
        ).toBeLessThan(
            Array.from(document.querySelectorAll<HTMLLabelElement>('label')).indexOf(numberingSwitch),
        );
        expect(Array.from(document.querySelectorAll('h3, h4')).map(heading => heading.textContent?.trim())).not.toContain('Character outlines');
        expect(orderSelect.textContent?.trim()).toBe('name');
        expect(orderPrefix.parentElement?.contains(orderSelect)).toBe(true);
        expect(Math.abs(
            orderPrefix.getBoundingClientRect().y
            + orderPrefix.getBoundingClientRect().height / 2
            - orderSelect.getBoundingClientRect().y
            - orderSelect.getBoundingClientRect().height / 2,
        )).toBeLessThan(1);
        await userEvent.click(outlineSwitch);
        await userEvent.click(oddPageSwitch);
        await userEvent.click(orderSelect);

        const appearance = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLButtonElement>('button[role="option"]'))
            .find(element => element.textContent?.trim() === 'first appearance') ?? null);

        const collapsedWidth = orderSelect.getBoundingClientRect().width;

        await userEvent.click(appearance);

        const output = document.querySelector('[data-testid="value"]')?.textContent ?? '';

        expect(output).toContain('"showPlaces":true');
        expect(output).toContain('"showCharacterOutlines":true');
        expect(output).toContain('"startEachInitialPageOnOddPage":false');
        expect(output).toContain('"characterOrder":"first-appearance"');
        expect(orderSelect.textContent?.trim()).toBe('first appearance');
        expect(Math.abs(orderSelect.getBoundingClientRect().width - collapsedWidth)).toBeLessThan(1);

        await userEvent.click(charactersSwitch);

        expect(findSwitch('Show character outlines')).toBeNull();
        expect(findSwitch('Places')).not.toBeNull();
        expect(checked(placesSwitch)).toBe(true);
        expect(findSwitch('Show page numbers')).not.toBeNull();

        await userEvent.click(placesSwitch);

        const disabledOutput = document.querySelector('[data-testid="value"]')?.textContent ?? '';

        expect(disabledOutput).toContain('"enabled":false');
        expect(disabledOutput).toContain('"showPlaces":false');
    });

    it('uses evenly centered rows with matching right-aligned selects', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <InitialPagesModule
                value={{
                    startEachInitialPageOnOddPage: true,
                    showPageNumbers: true,
                    charactersAndPlaces: {
                        ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
                    },
                    contents: {
                        ...BASIC_DEFAULTS.initialPages.contents,
                    },
                }}
                blankPages={{
                    betweenInitialPagesAndScript: {
                        ...BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript,
                    },
                }}
                hasAutomaticBalancingBlank={false}
                onChange={() => {}}
                onBlankPagesChange={() => {}}
            />,
        );
        mountedRoots.push(root);

        const oddPageSwitch = await waitFor(() => findSwitch('Start each initial page on an odd page'));
        const numberingSwitch = await waitFor(() => findSwitch('Show page numbers'));
        const charactersSwitch = await waitFor(() => findSwitch('Characters'));
        const outlineSwitch = await waitFor(() => findSwitch('Show character outlines'));
        const placesSwitch = await waitFor(() => findSwitch('Places'));
        const blankLabel = await waitFor(() => document.querySelector<HTMLLabelElement>('label[for="blank-page-count"]'));
        const blankSelect = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Blank page count"]'));
        const orderSelect = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Order characters by"]'));
        const orderPrefix = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLSpanElement>('span'))
            .find(element => element.textContent?.trim() === 'Order characters by') ?? null);
        const switchTrack = oddPageSwitch.querySelector<HTMLSpanElement>('span[aria-hidden="true"]')!;
        const blankRow = blankLabel.parentElement!;
        const orderRow = orderPrefix.parentElement!;
        const oddPageRow = oddPageSwitch.parentElement!;
        const numberingRow = numberingSwitch.parentElement!;
        const charactersRow = charactersSwitch.parentElement!;
        const outlineRow = outlineSwitch.parentElement!;
        const placesRow = placesSwitch.parentElement!;
        const rowHeights = [
            oddPageRow,
            numberingRow,
            blankRow,
            charactersRow,
            outlineRow,
            orderRow,
            placesRow,
        ].map(element => Math.round(element.getBoundingClientRect().height * 100));
        const blankSelectStyle = getComputedStyle(blankSelect);
        const orderSelectStyle = getComputedStyle(orderSelect);
        const orderRowStyle = getComputedStyle(orderRow);
        const availableOrderSelectWidth = orderRow.getBoundingClientRect().width
            - orderPrefix.getBoundingClientRect().width
            - Number.parseFloat(orderRowStyle.columnGap);

        expect(new Set(rowHeights).size).toBe(1);
        expect(Math.abs(
            oddPageSwitch.getBoundingClientRect().y
            + oddPageSwitch.getBoundingClientRect().height / 2
            - oddPageRow.getBoundingClientRect().y
            - oddPageRow.getBoundingClientRect().height / 2,
        )).toBeLessThan(1);
        expect(oddPageSwitch.getBoundingClientRect().height).toBeLessThan(oddPageRow.getBoundingClientRect().height);
        expect(Math.abs(
            blankLabel.getBoundingClientRect().y
            + blankLabel.getBoundingClientRect().height / 2
            - blankRow.getBoundingClientRect().y
            - blankRow.getBoundingClientRect().height / 2,
        )).toBeLessThan(1);
        expect(Math.abs(
            orderPrefix.getBoundingClientRect().y
            + orderPrefix.getBoundingClientRect().height / 2
            - orderRow.getBoundingClientRect().y
            - orderRow.getBoundingClientRect().height / 2,
        )).toBeLessThan(1);
        expect(Math.abs(blankSelect.getBoundingClientRect().right - switchTrack.getBoundingClientRect().right)).toBeLessThan(1);
        expect(Math.abs(orderSelect.getBoundingClientRect().right - switchTrack.getBoundingClientRect().right)).toBeLessThan(1);
        expect(orderSelect.getBoundingClientRect().width).toBeLessThan(availableOrderSelectWidth);
        expect(orderSelectStyle.height).toBe(blankSelectStyle.height);
        expect(orderSelectStyle.backgroundColor).toBe(blankSelectStyle.backgroundColor);
        expect(orderSelectStyle.borderTopColor).toBe(blankSelectStyle.borderTopColor);
        expect(orderSelectStyle.borderRadius).toBe(blankSelectStyle.borderRadius);
        expect(getComputedStyle(blankLabel).color).toBe(getComputedStyle(oddPageSwitch).color);
        expect(getComputedStyle(blankLabel).fontSize).toBe(getComputedStyle(oddPageSwitch).fontSize);
        expect(getComputedStyle(charactersRow.parentElement!).borderTopWidth).not.toBe('0px');
        expect(getComputedStyle(placesRow.parentElement!).borderTopWidth).toBe('0px');
    });

    it('toggles the contents page and switches its variant', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = () => {
            const [value, setValue] = useState<InitialPagesValue>(BASIC_DEFAULTS.initialPages);

            return (
                <InitialPagesModule
                    value={value}
                    blankPages={BASIC_DEFAULTS.blankPages}
                    hasAutomaticBalancingBlank={false}
                    onChange={setValue}
                    onBlankPagesChange={() => undefined}
                />
            );
        };

        document.body.append(host);
        mountedRoots.push(root);
        root.render(<Harness />);

        const contents = await waitFor(() => findSwitch('Contents'));

        expect(checked(contents)).toBe(true);

        const select = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Show contents as"]'));

        expect(select.textContent?.trim()).toBe('scenes and musical numbers');

        await userEvent.click(select);

        const option = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLButtonElement>('button[role="option"]'))
            .find(element => element.textContent?.trim() === 'musical numbers') ?? null);

        await userEvent.click(option);
        await waitFor(() => select.textContent?.trim() === 'musical numbers' ? select : null);

        await userEvent.click(contents);
        await waitFor(() => checked(contents) === false ? contents : null);
        expect(document.querySelector('button[aria-label="Show contents as"]')).toBeNull();
    });
});

