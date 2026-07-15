import {
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
import {page} from 'vite-plus/test/browser';

import {MultiComboBox} from './MultiComboBox';

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

const waitForSuggestion = async (label: string): Promise<HTMLElement> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const option = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="suggestions"] li'))
            .find(candidate => candidate.textContent?.trim() === label);

        if (option) {
            return option;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected suggestion ${label}`);
};

const waitForSuggestionsToClose = async () => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (!document.querySelector('[data-testid="suggestions"]')) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Expected suggestions to close');
};

const renderComboBox = () => {
    const host = document.createElement('div');
    const onChange = vi.fn<(value: string[]) => void>();
    const root = createRoot(host);
    const TestCase = () => {
        const [value, setValue] = useState<string[]>([]);

        return (
            <MultiComboBox
                label="Places"
                placeholder="Select places"
                options={[{id: 'backstage', label: 'Backstage'}, {id: 'main-stage', label: 'Main stage'}]}
                value={value}
                onChange={nextValue => {
                    onChange(nextValue);
                    setValue(nextValue);
                }}
            />
        );
    };

    host.style.width = '400px';
    host.style.setProperty('--size-scale', '1');
    document.body.appendChild(host);
    root.render(<TestCase />);
    mountedRoots.push(root);

    return onChange;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('MultiComboBox', () => {
    it('selects and removes multiple options', async () => {
        const onChange = renderComboBox();
        const input = await waitForElement<HTMLInputElement>('[placeholder="Select places"]');

        await page.elementLocator(input).click();

        const backstage = await waitForSuggestion('Backstage');

        await page.elementLocator(backstage).click();
        await waitForSuggestionsToClose();

        const selectedTag = await waitForElement<HTMLElement>('[data-testid="tag"]');

        expect(input.parentElement?.parentElement).toBe(selectedTag.parentElement);

        await page.elementLocator(input).click();

        expect(document.querySelector('[data-testid="suggestions"]')?.textContent)
            .not.toContain('Backstage');

        const mainStage = await waitForSuggestion('Main stage');

        await page.elementLocator(mainStage).click();
        await waitForSuggestionsToClose();

        expect(onChange).toHaveBeenLastCalledWith(['backstage', 'main-stage']);
        expect(document.body.textContent).toContain('Backstage');
        expect(document.body.textContent).toContain('Main stage');

        const removeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label^="Remove "]'));

        await page.elementLocator(removeButtons[0]).click();

        expect(onChange).toHaveBeenLastCalledWith(['main-stage']);
    });
});
