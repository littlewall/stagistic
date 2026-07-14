import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {AttributeManagerPlacesPanel} from './AttributeManagerPlacesPanel';

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

const findButtonByText = (label: string): HTMLButtonElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(candidate => candidate.textContent?.trim() === label);

    if (!button) {
        throw new Error(`Expected a button labelled ${label}`);
    }

    return button;
};

const renderPanel = () => {
    const host = document.createElement('div');
    const onCreatePlace = vi.fn(async (name: string) => ({id: 'place-3', name}));
    const onRenamePlace = vi.fn(async () => undefined);
    const onDeletePlace = vi.fn(async () => undefined);

    host.style.width = '900px';
    host.style.height = '600px';
    host.style.setProperty('--size-scale', '1');
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <AttributeManagerPlacesPanel
            places={[
                {id: 'place-1', name: 'Backstage'},
                {id: 'place-2', name: 'Main stage'},
            ]}
            onCreatePlace={onCreatePlace}
            onRenamePlace={onRenamePlace}
            onDeletePlace={onDeletePlace}
        />,
    );
    mountedRoots.push(root);

    return {
        onCreatePlace,
        onRenamePlace,
        onDeletePlace,
    };
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AttributeManagerPlacesPanel', () => {
    it('creates a place from the add action', async () => {
        const {onCreatePlace} = renderPanel();

        await page.elementLocator(await waitForElement('[aria-label="Create place"]')).click();

        const nameInput = await waitForElement<HTMLInputElement>('#create-place-name');

        await page.elementLocator(nameInput).fill('Green room');
        await page.elementLocator(findButtonByText('Create place')).click();

        expect(onCreatePlace).toHaveBeenCalledWith('Green room');
    });

    it('renames the selected place on blur', async () => {
        const {onRenamePlace} = renderPanel();
        const nameInput = await waitForElement<HTMLInputElement>('#place-name-place-1');

        await page.elementLocator(nameInput).fill('Stage left');
        nameInput.blur();

        expect(onRenamePlace).toHaveBeenCalledWith('place-1', 'Stage left');
    });

    it('deletes only after confirmation', async () => {
        const {onDeletePlace} = renderPanel();

        await page.elementLocator(await waitForElement('[aria-label="Remove Backstage"]')).click();
        await waitForElement('dialog[aria-label="Remove place"]');

        expect(onDeletePlace).not.toHaveBeenCalled();

        await page.elementLocator(findButtonByText('Remove')).click();

        expect(onDeletePlace).toHaveBeenCalledWith('place-1');
    });
});
