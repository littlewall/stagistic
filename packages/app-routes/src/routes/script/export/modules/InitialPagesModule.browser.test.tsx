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
    it('controls Characters and Places with positive place visibility', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = () => {
            const [value, setValue] = useState<InitialPagesValue>({
                startEachInitialPageOnOddPage: BASIC_DEFAULTS.initialPages.startEachInitialPageOnOddPage,
                showPageNumbers: BASIC_DEFAULTS.initialPages.showPageNumbers,
                charactersAndPlaces: {
                    ...BASIC_DEFAULTS.initialPages.charactersAndPlaces,
                },
            });

            return (
                <>
                    <InitialPagesModule value={value} onChange={setValue} />
                    <output data-testid="value">{JSON.stringify(value)}</output>
                </>
            );
        };

        document.body.appendChild(host);
        root.render(<Harness />);
        mountedRoots.push(root);

        const pageSwitch = await waitFor(() => findSwitch('Characters and places'));
        const placesSwitch = await waitFor(() => findSwitch('Show places'));
        const outlineSwitch = await waitFor(() => findSwitch('Show character outlines'));
        const oddPageSwitch = await waitFor(() => findSwitch('Start each initial page on an odd page'));
        const numberingSwitch = await waitFor(() => findSwitch('Show page numbers'));
        const orderSelect = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Order characters by"]'));
        const orderPrefix = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLSpanElement>('span'))
            .find(element => element.textContent?.trim() === 'Order characters by') ?? null);
        const charactersHeading = document.querySelector<HTMLHeadingElement>('h4');
        const placesHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>('h4')).at(-1);

        expect(checked(pageSwitch)).toBe(true);
        expect(checked(placesSwitch)).toBe(true);
        expect(checked(outlineSwitch)).toBe(false);
        expect(checked(oddPageSwitch)).toBe(true);
        expect(checked(numberingSwitch)).toBe(true);
        expect(
            Array.from(document.querySelectorAll<HTMLLabelElement>('label')).indexOf(oddPageSwitch),
        ).toBeLessThan(
            Array.from(document.querySelectorAll<HTMLLabelElement>('label')).indexOf(numberingSwitch),
        );
        expect(charactersHeading?.textContent).toBe('Characters');
        expect(placesHeading?.textContent).toBe('Places');
        expect(orderSelect.textContent).toContain('Name');
        expect(orderPrefix.parentElement?.contains(orderSelect)).toBe(true);
        expect(Math.abs(
            orderPrefix.getBoundingClientRect().y
            + orderPrefix.getBoundingClientRect().height / 2
            - orderSelect.getBoundingClientRect().y
            - orderSelect.getBoundingClientRect().height / 2,
        )).toBeLessThan(1);
        expect(getComputedStyle(orderSelect).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(
            outlineSwitch.getBoundingClientRect().top
            - charactersHeading!.getBoundingClientRect().bottom,
        ).toBeGreaterThan(6);
        expect(
            placesSwitch.getBoundingClientRect().top
            - placesHeading!.getBoundingClientRect().bottom,
        ).toBeGreaterThan(6);

        await userEvent.click(placesSwitch);
        await userEvent.click(outlineSwitch);
        await userEvent.click(oddPageSwitch);
        await userEvent.click(orderSelect);

        const appearance = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLButtonElement>('button[role="option"]'))
            .find(element => element.textContent?.trim() === 'First appearance') ?? null);

        await userEvent.click(appearance);

        const output = document.querySelector('[data-testid="value"]')?.textContent ?? '';

        expect(output).toContain('"showPlaces":false');
        expect(output).toContain('"showCharacterOutlines":true');
        expect(output).toContain('"startEachInitialPageOnOddPage":false');
        expect(output).toContain('"characterOrder":"first-appearance"');

        await userEvent.click(pageSwitch);

        expect(findSwitch('Show places')).toBeNull();
        expect(findSwitch('Show page numbers')).not.toBeNull();
    });
});
