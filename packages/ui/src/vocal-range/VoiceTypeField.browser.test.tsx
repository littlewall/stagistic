import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {VoiceTypeField} from './VoiceTypeField';

const mountedRoots: Root[] = [];

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

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const renderField = (initialValue: string | null = null) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const onChange = vi.fn<(value: string | null) => void>();
    const TestCase = () => {
        const [value, setValue] = useState(initialValue);

        return (
            <VoiceTypeField
                value={value}
                onChange={nextValue => {
                    onChange(nextValue);
                    setValue(nextValue);
                }}
            />
        );
    };

    document.body.appendChild(host);
    root.render(<TestCase />);
    mountedRoots.push(root);

    return onChange;
};

describe('VoiceTypeField', () => {
    it('accepts free text and commits it on blur', async () => {
        const onChange = renderField();
        const input = await waitForElement<HTMLInputElement>('[role="combobox"]');

        await page.elementLocator(input).fill('light baritone');
        input.blur();

        expect(onChange).toHaveBeenLastCalledWith('light baritone');
    });

    it('clears to null when blurred empty', async () => {
        const onChange = renderField('tenor');
        const input = await waitForElement<HTMLInputElement>('[role="combobox"]');

        await page.elementLocator(input).fill('');
        input.blur();

        expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it('lists the fixed suggestions when focused', async () => {
        renderField();

        const input = await waitForElement<HTMLInputElement>('[role="combobox"]');

        await page.elementLocator(input).click();

        const options = await waitForElement('[role="listbox"]');

        expect(options.textContent).toContain('soprano');
        expect(options.textContent).toContain('tenor');
    });

    it('selects a suggestion by clicking it', async () => {
        const onChange = renderField();
        const input = await waitForElement<HTMLInputElement>('[role="combobox"]');

        await page.elementLocator(input).click();

        const option = await waitForElement<HTMLElement>('[role="option"]');

        await page.elementLocator(option).click();

        expect(onChange).toHaveBeenCalledWith(option.textContent);
    });
});
