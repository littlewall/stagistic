import '@stagistic/ui/styles/base.css';

import {
    Select,
    type SelectOption,
} from '@stagistic/ui';
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
import {page} from 'vite-plus/test/browser';

const OPTIONS: SelectOption[] = [
    {value: 1, label: '1'},
    {value: 2, label: '2'},
    {value: 3, label: '3'},
    {value: 4, label: '4'},
    {value: 5, label: '5'},
    {value: 6, label: '6'},
    {value: 7, label: '7'},
    {value: 8, label: '8'},
    {value: 9, label: '9'},
    {value: 0, label: '0'},
];

const mountedRoots: Root[] = [];

const waitForAnimationFrame = async () => {
    await new Promise(resolve => {
        window.requestAnimationFrame(resolve);
    });
};

const waitForElement = async <T extends Element>(selector: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const AnchoredSelectFixture = () => {
    const [value, setValue] = useState<number | string>(2);

    return (
        <div
            style={{
                position: 'fixed',
                top: 'calc(100vh - 120px)',
                left: '120px',
                width: '240px',
            }}
        >
            <Select
                id="shortcut-select"
                value={value}
                options={OPTIONS}
                ariaLabel="Shortcut"
                onChange={setValue}
            />
        </div>
    );
};

const renderFixture = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(<AnchoredSelectFixture />);
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('Select viewport height', () => {
    it('keeps anchored options scrollable inside the viewport', async () => {
        renderFixture();

        const trigger = page.elementLocator(await waitForElement<HTMLButtonElement>('[aria-label="Shortcut"]'));

        await trigger.click();
        await waitForAnimationFrame();

        const listbox = await waitForElement<HTMLElement>('[role="listbox"]');
        const rect = listbox.getBoundingClientRect();

        expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);

        listbox.scrollTop = listbox.scrollHeight;
        await waitForAnimationFrame();

        const options = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'));
        const lastOption = options.at(-1);
        const lastOptionRect = lastOption?.getBoundingClientRect();

        expect(lastOption?.textContent?.trim()).toBe('0');
        expect(lastOptionRect?.bottom).toBeLessThanOrEqual(rect.bottom + 1);
    });
});
