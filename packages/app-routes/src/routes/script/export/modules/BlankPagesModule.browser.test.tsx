import '@stagistic/ui/styles/base.css';

import {
    BASIC_DEFAULTS,
    type BlankPagesValue,
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

import {BlankPagesModule} from './BlankPagesModule';

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

const waitForMissing = async (query: () => Element | null) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (!query()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Expected element to be removed.');
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('BlankPagesModule', () => {
    it('selects no blank pages or a count between one and ten', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = ({
            hasAutomaticBalancingBlank,
        }: {
            hasAutomaticBalancingBlank: boolean,
        }) => {
            const [value, setValue] = useState<BlankPagesValue>({
                betweenInitialPagesAndScript: {
                    ...BASIC_DEFAULTS.blankPages.betweenInitialPagesAndScript,
                },
            });

            return (
                <>
                    <BlankPagesModule
                        value={value}
                        hasAutomaticBalancingBlank={hasAutomaticBalancingBlank}
                        onChange={setValue}
                    />
                    <output data-testid="value">{JSON.stringify(value)}</output>
                </>
            );
        };

        document.body.appendChild(host);
        root.render(<Harness hasAutomaticBalancingBlank />);
        mountedRoots.push(root);

        const select = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Blank page count"]'));

        expect(select.textContent?.trim()).toBe('none');
        expect(document.querySelector('input[role="switch"]')).toBeNull();
        expect(document.querySelector('input[type="number"]')).toBeNull();

        await userEvent.click(select);

        const options = await waitFor(() => document.querySelector<HTMLElement>('[role="listbox"]'));
        const optionLabels = Array
            .from(options.querySelectorAll<HTMLElement>('[role="option"]'))
            .map(option => option.textContent?.trim());

        expect(optionLabels).toEqual([
            'none',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            '10',
        ]);

        const tenOption = Array
            .from(options.querySelectorAll<HTMLButtonElement>('[role="option"]'))
            .find(option => option.textContent?.trim() === '10');

        expect(tenOption).not.toBeUndefined();

        if (!tenOption) {
            return;
        }

        await userEvent.click(tenOption);

        await waitFor(() => document.querySelector<HTMLOutputElement>('[data-testid="value"]')?.textContent?.includes('"count":10')
            ? document.querySelector<HTMLOutputElement>('[data-testid="value"]')
            : null);

        const balancingIndicator = await waitFor(() => document.querySelector<HTMLButtonElement>('[data-testid="balancing-blank-indicator"]'));

        expect(select.textContent?.trim()).toBe('10');
        expect(document.querySelector('[data-testid="value"]')?.textContent).toContain('"enabled":true');
        expect(balancingIndicator.textContent).toBe('+1');
        expect(balancingIndicator.getBoundingClientRect().left - select.getBoundingClientRect().right).toBeLessThan(16);

        await userEvent.hover(balancingIndicator);

        const tooltip = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLElement>('[role="tooltip"]'))
            .find(element => element.textContent?.includes('script starts on an odd page')) ?? null);

        expect(tooltip.textContent).toContain('An additional blank page');

        await userEvent.click(select);

        const noneOption = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLButtonElement>('[role="option"]'))
            .find(option => option.textContent?.trim() === 'none') ?? null);

        await userEvent.click(noneOption);

        await waitFor(() => document.querySelector<HTMLOutputElement>('[data-testid="value"]')?.textContent?.includes('"enabled":false')
            ? document.querySelector<HTMLOutputElement>('[data-testid="value"]')
            : null);

        expect(select.textContent?.trim()).toBe('none');
        expect(document.querySelector('[data-testid="value"]')?.textContent).toContain('"count":10');
        await waitForMissing(() => document.querySelector('[data-testid="balancing-blank-indicator"]'));

        root.render(<Harness hasAutomaticBalancingBlank={false} />);

        await waitForMissing(() => document.querySelector('[data-testid="balancing-blank-indicator"]'));

        expect(document.querySelector('[data-testid="balancing-blank-indicator"]')).toBeNull();
    });

    it('normalizes an invalid enabled count before displaying or retaining it', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = () => {
            const [value, setValue] = useState<BlankPagesValue>({
                betweenInitialPagesAndScript: {
                    enabled: true,
                    count: 20,
                },
            });

            return (
                <>
                    <BlankPagesModule
                        value={value}
                        hasAutomaticBalancingBlank={false}
                        onChange={setValue}
                    />
                    <output data-testid="value">{JSON.stringify(value)}</output>
                </>
            );
        };

        document.body.appendChild(host);
        root.render(<Harness />);
        mountedRoots.push(root);

        const select = await waitFor(() => document.querySelector<HTMLButtonElement>('button[aria-label="Blank page count"]'));

        expect(select.textContent?.trim()).toBe('10');

        await userEvent.click(select);

        const noneOption = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLButtonElement>('[role="option"]'))
            .find(option => option.textContent?.trim() === 'none') ?? null);

        await userEvent.click(noneOption);

        await waitFor(() => document.querySelector<HTMLOutputElement>('[data-testid="value"]')?.textContent?.includes('"enabled":false')
            ? document.querySelector<HTMLOutputElement>('[data-testid="value"]')
            : null);

        expect(document.querySelector('[data-testid="value"]')?.textContent).toContain('"count":10');
    });
});
