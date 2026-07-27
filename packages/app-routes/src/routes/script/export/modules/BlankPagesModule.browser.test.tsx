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
    it('keeps enabled blank-page counts between one and ten', async () => {
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

        const pageSwitch = await waitFor(() => document.querySelector<HTMLInputElement>('input[role="switch"]'));
        const pageSwitchLabel = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLLabelElement>('label'))
            .find(element => element.textContent?.trim() === 'Blank pages') ?? null);

        expect(pageSwitch.checked).toBe(false);
        expect(document.querySelector('input[type="number"]')).toBeNull();

        await userEvent.click(pageSwitchLabel);

        const input = await waitFor(() => document.querySelector<HTMLInputElement>('input[type="number"]'));
        const countLabel = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLLabelElement>('label'))
            .find(element => element.textContent?.trim() === 'Count') ?? null);
        const balancingIndicator = await waitFor(() => document.querySelector<HTMLButtonElement>('[data-testid="balancing-blank-indicator"]'));

        expect(input.value).toBe('1');
        expect(input.getBoundingClientRect().left - countLabel.getBoundingClientRect().right).toBeLessThan(16);
        expect(balancingIndicator.textContent).toBe('+1');
        expect(balancingIndicator.getBoundingClientRect().left - input.getBoundingClientRect().right).toBeLessThan(16);

        await userEvent.hover(balancingIndicator);

        const tooltip = await waitFor(() => Array
            .from(document.querySelectorAll<HTMLElement>('[role="tooltip"]'))
            .find(element => element.textContent?.includes('script starts on an odd page')) ?? null);

        expect(tooltip.textContent).toContain('An additional blank page');

        await userEvent.click(input);
        await userEvent.keyboard('{ArrowDown}');

        expect(input.value).toBe('1');

        await userEvent.keyboard(
            Array.from({length: 12}, () => '{ArrowUp}').join(''),
        );

        expect(input.value).toBe('10');

        root.render(<Harness hasAutomaticBalancingBlank={false} />);

        await waitForMissing(() => document.querySelector('[data-testid="balancing-blank-indicator"]'));

        expect(document.querySelector('[data-testid="balancing-blank-indicator"]')).toBeNull();
    });
});
