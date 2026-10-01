import '@stagistic/ui/styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {VisualPreferencesSettingsPanel} from './VisualPreferencesSettingsPanel';

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

const mountedRoots: Root[] = [];

const renderPanel = async (characterDecoration: Parameters<typeof VisualPreferencesSettingsPanel>[0]['characterDecoration']) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <VisualPreferencesSettingsPanel
            characterDecoration={characterDecoration}
            onUpdateCharacterDecoration={() => {}}
        />,
    );
    mountedRoots.push(root);

    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const preview = document.querySelector<HTMLElement>('[data-testid="character-decoration-preview"]');

        if (preview) {
            return preview;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Expected character decoration preview');
};

const getPreviewParts = (preview: HTMLElement) => {
    const names = [...preview.querySelectorAll<HTMLElement>('span')];
    const line = [...preview.querySelectorAll<HTMLElement>('p')].at(-1)!;

    return {names, line};
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('VisualPreferencesSettingsPanel', () => {
    it('previews underline only by default', async () => {
        const {names, line} = getPreviewParts(await renderPanel('underline'));

        names.forEach(name => {
            expect(getComputedStyle(name).textDecorationLine).toContain('underline');
            expect(getComputedStyle(name).backgroundColor).toBe(TRANSPARENT);
        });
        expect(getComputedStyle(line).backgroundColor).toBe(TRANSPARENT);
    });

    it('previews tinted names and lines', async () => {
        const {names, line} = getPreviewParts(await renderPanel('underline-tint-lines'));

        names.forEach(name => {
            expect(getComputedStyle(name).backgroundColor).not.toBe(TRANSPARENT);
        });
        expect(getComputedStyle(line).backgroundColor).not.toBe(TRANSPARENT);
    });

    it('sizes the select to fit the longest option', async () => {
        await renderPanel('underline');

        const button = document.querySelector<HTMLButtonElement>('#character-decoration')!;
        const probe = document.createElement('span');

        probe.style.whiteSpace = 'nowrap';
        probe.style.font = getComputedStyle(button).font;
        probe.textContent = 'Underline + tinted names and lines';
        document.body.appendChild(probe);

        expect(button.getBoundingClientRect().width).toBeGreaterThan(probe.getBoundingClientRect().width);
    });

    it('previews no decoration', async () => {
        const {names} = getPreviewParts(await renderPanel('none'));

        names.forEach(name => {
            expect(getComputedStyle(name).textDecorationLine).toBe('none');
        });
    });
});
