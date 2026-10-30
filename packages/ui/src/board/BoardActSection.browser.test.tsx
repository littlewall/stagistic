import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {BoardActSection} from './BoardActSection';
import {BoardLayout} from './BoardLayout';
import {SceneCard} from './SceneCard';

let root: Root | null = null;

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

const mount = (width: number, node: React.ReactNode) => {
    const host = document.createElement('div');

    host.style.width = `${width}px`;
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(node);
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('BoardActSection', () => {
    it('names the section by its act and lays cards on fixed-width tracks that wrap', async () => {
        mount(
            640,
            <BoardActSection title="ACT ONE">
                <SceneCard number={1} title="One" page={1} />
                <SceneCard number={2} title="Two" page={2} />
                <SceneCard number={3} title="Three" page={null} />
            </BoardActSection>,
        );

        const section = await waitForElement<HTMLElement>('section[aria-label="ACT ONE"]');
        const cards = [...section.querySelectorAll<HTMLElement>('li')].map(card => card.getBoundingClientRect());
        const [
            first,
            second,
            third,
        ] = cards;

        expect(section.querySelector('h2')?.textContent).toBe('ACT ONE');
        expect(requireValue(first, 'first').width).toBe(288);
        expect(requireValue(second, 'second').width).toBe(288);
        expect(requireValue(second, 'second').top).toBe(requireValue(first, 'first').top);
        expect(requireValue(third, 'third').top).toBeGreaterThan(requireValue(first, 'first').top);
        expect(requireValue(third, 'third').left).toBe(requireValue(first, 'first').left);
    });

    it('says so when an act has no scenes', async () => {
        mount(640, <BoardActSection title="ACT TWO" />);

        await waitForElement('section[aria-label="ACT TWO"]');

        expect(document.body.textContent).toContain('No scenes in this act.');
        expect(document.querySelector('ul')).toBeNull();
    });
});

describe('BoardLayout', () => {
    it('separates the toolbar from the canvas with a hairline and scrolls only the canvas', async () => {
        const host = document.createElement('div');

        host.style.height = '300px';
        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <BoardLayout toolbar={<span>Options</span>}>
                <div style={{height: '900px'}}>Tall</div>
            </BoardLayout>,
        );
        await waitForElement('[class*="canvas"]');

        const toolbar = requireValue(document.querySelector<HTMLElement>('[class*="toolbar"]'), 'toolbar');
        const canvas = requireValue(document.querySelector<HTMLElement>('[class*="canvas"]'), 'canvas');

        expect(getComputedStyle(toolbar).borderBottomWidth).toBe('1px');
        expect(canvas.scrollHeight).toBeGreaterThan(canvas.clientHeight);
        expect(toolbar.getBoundingClientRect().bottom).toBeLessThanOrEqual(canvas.getBoundingClientRect().top);
    });

    it('omits the toolbar when there is none', async () => {
        mount(400, <BoardLayout><p>Content</p></BoardLayout>);
        await waitForElement('[class*="canvas"]');

        expect(document.querySelector('[class*="toolbar"]')).toBeNull();
    });
});
