import '@stagistic/ui/styles/base.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {InitialPagesSettingsPanel} from './InitialPagesSettingsPanel';

const mountedRoots: Root[] = [];

const waitForButton = async (label: string): Promise<HTMLButtonElement> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const button = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

        if (button) {
            return button;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected button ${label}`);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('InitialPagesSettingsPanel', () => {
    it('shows the selected value before the parent provides updated settings', async () => {
        const onUpdate = vi.fn();
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(
            <InitialPagesSettingsPanel
                settings={{
                    castAndPlace: {castOrderBy: 'name', showOutline: true},
                    songs: {showCharactersInSongs: false},
                }}
                onUpdate={onUpdate}
            />,
        );
        mountedRoots.push(root);

        const appearanceButton = await waitForButton('Appearance');

        expect(appearanceButton.getAttribute('aria-checked')).toBe('false');

        await userEvent.click(appearanceButton);

        expect(onUpdate).toHaveBeenCalledWith({castAndPlace: {castOrderBy: 'appearance'}});
        expect(appearanceButton.getAttribute('aria-checked')).toBe('true');
    });
});
