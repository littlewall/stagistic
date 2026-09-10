import '../styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import {IconButton} from './atoms/IconButton';
import {ListRow} from './molecules/ListRow';
import {ToggleButtonGroup} from './molecules/ToggleButtonGroup';

const mountedRoots: Root[] = [];

const mount = (node: React.ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    mountedRoots.push(root);
    root.render(node);

    return host;
};

const waitForElement = async (host: HTMLElement, selector: string) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = host.querySelector<HTMLElement>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const isTransparent = (color: string) => (/rgba\(0, 0, 0, 0\)|transparent/).test(color);

afterEach(() => {
    mountedRoots.splice(0).forEach(root => {
        root.unmount();
    });
    document.body.innerHTML = '';
});

describe('selection is carried by fill alone', () => {
    it('gives a selected list row a lime fill and no ring', async () => {
        const host = mount(<ListRow selected interactive>Scene one</ListRow>);

        const row = await waitForElement(host, '[aria-selected = "true"]');
        const style = getComputedStyle(row);

        expect(style.boxShadow).toBe('none');
        expect(isTransparent(style.backgroundColor)).toBe(false);
    });

    it('gives a selected toolbar icon button a fill and no ring', async () => {
        const host = mount(
            <IconButton aria-label="Bold" isSelected>
                <span>B</span>
            </IconButton>,
        );

        const button = await waitForElement(host, 'button');
        const style = getComputedStyle(button);

        expect(style.boxShadow).toBe('none');
        expect(isTransparent(style.backgroundColor)).toBe(false);
    });

    it('gives a selected toggle button a fill and a transparent border', async () => {
        const host = mount(
            <ToggleButtonGroup
                ariaLabel="Alignment"
                value="center"
                onChange={() => undefined}
                options={[
                    {
                        value: 'left',
                        label: 'Left',
                    }, {
                        value: 'center',
                        label: 'Center',
                    },
                ]}
            />,
        );

        const selected = await waitForElement(host, '[data-selected]');
        const style = getComputedStyle(selected);

        expect(isTransparent(style.borderTopColor)).toBe(true);
        expect(isTransparent(style.backgroundColor)).toBe(false);
    });
});
