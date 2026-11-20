import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {ScriptLoadFailure} from './ScriptLoadFailure';

let root: Root | null = null;

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
});

describe('ScriptLoadFailure', () => {
    it('offers no editor, only a calm message and Try again', async () => {
        const onRetry = vi.fn();
        const host = document.createElement('div');

        document.body.append(host);
        root = createRoot(host);
        root.render(<ScriptLoadFailure onRetry={onRetry} />);

        await vi.waitFor(() => expect(host.querySelector('[role="alert"]')).not.toBeNull());

        expect(host.querySelector('[contenteditable="true"]')).toBeNull();
        expect(host.textContent).toContain('could not be loaded');

        const button = [...host.querySelectorAll('button')].find(item => item.textContent === 'Try again');

        button?.click();

        expect(onRetry).toHaveBeenCalledTimes(1);
    });
});
