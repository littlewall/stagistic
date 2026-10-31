import '@stagistic/ui/styles/base.css';

import type {SceneBoardAct} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useBoardDeleteAct} from './useBoardDeleteAct';

let root: Root | null = null;

const act = (blockId: string, name: string): SceneBoardAct => ({
    actBlockId: blockId,
    name,
    scenes: [],
});

/* Mounts the hook behind a button, so the test drives it the way the Wall does. */
const Probe = ({acts, deleteAct}: {acts: readonly SceneBoardAct[], deleteAct: (blockId: string) => boolean}) => {
    const {requestDeleteAct, modal} = useBoardDeleteAct(acts, deleteAct);

    return (
        <div>
            <button type="button" onClick={() => requestDeleteAct('a1', 'ACT ONE')}>Request</button>
            <ul>{acts.map(item => <li key={item.actBlockId}>{item.name}</li>)}</ul>
            {modal}
        </div>
    );
};

const render = (acts: readonly SceneBoardAct[]) => {
    const deleteAct = vi.fn(() => true);
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<Probe acts={acts} deleteAct={deleteAct} />);

    return {deleteAct, rerender: (next: readonly SceneBoardAct[]) => root?.render(<Probe acts={next} deleteAct={deleteAct} />)};
};

const actNames = () => [...document.querySelectorAll('li')].map(item => item.textContent);

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('useBoardDeleteAct', () => {
    it('dismisses the request for good when the act disappears, even if it later returns', async () => {
        const acts = [act('a1', 'ACT ONE'), act('a2', 'ACT TWO')];
        const {deleteAct, rerender} = render(acts);

        const requestButton = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Request');

        await expect.poll(() => requestButton() !== undefined).toBe(true);
        await userEvent.click(requireValue(requestButton()));
        await expect.poll(() => document.querySelector('dialog[open]')).not.toBeNull();

        const dialog = requireValue(document.querySelector<HTMLElement>('dialog[open]'));

        expect(dialog.textContent).toContain('Delete act “ACT ONE”?');

        // The act disappears (deleted elsewhere, undo): the panel closes with the request.
        rerender([act('a2', 'ACT TWO')]);
        await expect.poll(() => document.querySelector('dialog[open]')).toBeNull();

        // The act returns: the old confirmation must not resurrect.
        rerender(acts);
        await expect.poll(() => actNames()).toEqual(['ACT ONE', 'ACT TWO']);
        expect(document.querySelector('dialog[open]')).toBeNull();
        expect(deleteAct).not.toHaveBeenCalled();
    });
});
