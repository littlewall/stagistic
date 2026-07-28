import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {LoaderOverlay} from './LoaderOverlay';

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

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

type LoaderCopy = {
    messages?: string[],
};

const renderLoader = (copy?: LoaderCopy) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);
    const render = (nextCopy?: LoaderCopy) => {
        root.render(
            <LoaderOverlay
                label="Preparing editor"
                messages={nextCopy?.messages}
            />,
        );
    };

    render(copy);
    mountedRoots.push(root);

    return {render};
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('LoaderOverlay', () => {
    it('renders a flat progress-first panel', async () => {
        renderLoader();

        const progressBar = await waitForElement<HTMLElement>('[role="progressbar"]');
        const panel = progressBar.parentElement!;
        const panelStyle = getComputedStyle(panel);

        expect(panel.firstElementChild).toBe(progressBar);
        expect(panelStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
        expect(panelStyle.borderTopWidth).toBe('0px');
        expect(panelStyle.boxShadow).toBe('none');
    });

    it('keeps the progress bar fixed while copy grows downward', async () => {
        const loader = renderLoader({messages: ['Loading your script']});
        const progressBar = await waitForElement<HTMLElement>('[role="progressbar"]');
        const initialTop = progressBar.getBoundingClientRect().top;

        loader.render({
            messages: ['A long operation '.repeat(30), 'Another long operation '.repeat(30)],
        });
        await waitFor(() => document.body.textContent?.includes('Another long operation') === true);

        const updatedTop = progressBar.getBoundingClientRect().top;

        expect(Math.abs(updatedTop - initialTop)).toBeLessThan(1);
    });

    it('centers the progress row in the viewport', async () => {
        renderLoader();

        const progressBar = await waitForElement<HTMLElement>('[role="progressbar"]');
        const progressRect = progressBar.getBoundingClientRect();
        const progressCenter = progressRect.top + progressRect.height / 2;

        expect(Math.abs(progressCenter - window.innerHeight / 2)).toBeLessThan(1);
    });

    it('shows only active operations and removes completed ones', async () => {
        const loader = renderLoader({
            messages: ['Creating your script', 'Preparing editor route'],
        });

        await waitFor(() => document.body.textContent?.includes('Creating your script') === true);
        expect(document.body.textContent).toContain('Preparing editor route');

        loader.render({messages: ['Preparing editor route']});
        await waitFor(() => document.body.textContent?.includes('Creating your script') === false);

        expect(document.body.textContent).toContain('Preparing editor route');
    });
});
