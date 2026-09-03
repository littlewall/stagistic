import '../../../styles/tokens.css';

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

import {
    PanelHeader,
    SettingsGroup,
} from './SettingsGroup';

const mountedRoots: Root[] = [];

const mount = (node: React.ReactNode): HTMLElement => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(node);
    mountedRoots.push(root);

    return host;
};

const waitFor = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected ${selector}`);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('SettingsGroup gap', () => {
    it('defaults to md and widens for 2xl', async () => {
        mount(
            <>
                <SettingsGroup><span id="md-child">x</span></SettingsGroup>
                <SettingsGroup gap="2xl"><span id="xl-child">y</span></SettingsGroup>
            </>,
        );

        const md = (await waitFor('#md-child')).parentElement as HTMLElement;
        const xl = (await waitFor('#xl-child')).parentElement as HTMLElement;

        expect(Number.parseFloat(getComputedStyle(xl).rowGap)).toBeGreaterThan(
            Number.parseFloat(getComputedStyle(md).rowGap),
        );
    });
});

describe('PanelHeader level', () => {
    it('renders h2 by default and h3 on request, at the same type size', async () => {
        mount(
            <>
                <PanelHeader title="Default" />
                <PanelHeader level={3} title="Third" />
            </>,
        );

        const h2 = await waitFor<HTMLElement>('h2');
        const h3 = await waitFor<HTMLElement>('h3');

        expect(h2.textContent).toBe('Default');
        expect(h3.textContent).toBe('Third');
        expect(getComputedStyle(h3).fontSize).toBe(getComputedStyle(h2).fontSize);
        expect(getComputedStyle(h3).fontWeight).toBe(getComputedStyle(h2).fontWeight);
    });
});
