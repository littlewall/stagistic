import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {BoardSceneComposer} from './BoardSceneComposer';

let root: Root | undefined;
const waitFor = async <T extends Element>(selector: string): Promise<T> => {
    const end = Date.now() + 1500;

    while (Date.now() < end) {
        const element = document.querySelector<T>(selector);

        if (element) return element;

        await new Promise(resolve => setTimeout(resolve, 10));
    }

    throw new Error(`Missing ${selector}`);
};

afterEach(() => {
    root?.unmount();
    root = undefined;
    document.body.innerHTML = '';
});

describe('BoardSceneComposer', () => {
    it('inserts a named scene and cancels an unfinished draft', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);

        const submit = vi.fn(() => true);
        const cancel = vi.fn();

        root.render(<BoardSceneComposer onSubmit={submit} onCancel={cancel} />);

        const input = await waitFor<HTMLInputElement>('input');

        await userEvent.type(input, 'A scene{Enter}');
        expect(submit).toHaveBeenCalledExactlyOnceWith('A scene');
        await userEvent.keyboard('{Escape}');
        expect(cancel).toHaveBeenCalledOnce();
    });
});
