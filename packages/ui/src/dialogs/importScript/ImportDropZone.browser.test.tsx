import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ImportDropZone} from './ImportDropZone';

let mountedRoot: Root | null = null;

const renderDropZone = (onPickFile?: () => void) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(
        <ImportDropZone
            fileLabel="Choose a script"
            onDrop={() => {}}
            onFileSelect={() => {}}
            onPickFile={onPickFile}
        />,
    );

    return host;
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

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('ImportDropZone', () => {
    it('uses one keyboard target for the platform file picker', async () => {
        const onPickFile = vi.fn();
        const host = renderDropZone(onPickFile);

        await waitFor(() => host.querySelectorAll('button').length > 0);

        const buttons = host.querySelectorAll<HTMLButtonElement>('button');

        expect(buttons).toHaveLength(1);
        await userEvent.tab();

        const styles = window.getComputedStyle(buttons[0]);

        expect(document.activeElement).toBe(buttons[0]);
        expect(styles.outlineStyle).toBe('solid');
        expect(styles.outlineWidth).toBe('2px');
        expect(styles.outlineOffset).toBe('2px');

        await userEvent.click(buttons[0]);
        expect(onPickFile).toHaveBeenCalledOnce();
    });

    it('uses one keyboard target for the browser file picker', async () => {
        const host = renderDropZone();

        await waitFor(() => host.querySelectorAll('button').length > 0);

        expect(host.querySelectorAll('button')).toHaveLength(1);
    });
});
