import '../../styles/tokens.css';

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

import {BoardAddCharacter} from './BoardAddCharacter';

let root: Root | null = null;

const waitFor = async <T,>(read: () => T | null | undefined | false): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) return value;

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

const render = () => {
    const props = {
        onAdd: vi.fn(),
        onCreate: vi.fn(),
        canCreate: (name: string) => name.toUpperCase() !== 'ANNA',
    };
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <BoardAddCharacter
            label="Add character to scene 1"
            options={[
                {
                    id: 'c-ben',
                    name: 'BEN',
                    color: '#2266cc',
                },
                {
                    id: 'c-cy',
                    name: 'CY',
                    color: null,
                },
            ]}
            {...props}
        />,
    );

    return props;
};

const items = () => [...document.querySelectorAll('[role="menuitem"]')].map(item => item.textContent);
const open = async () => {
    await userEvent.click(await waitFor(() => document.querySelector<HTMLElement>('[aria-label="Add character to scene 1"]')));
    await waitFor(() => document.querySelector('input'));
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('BoardAddCharacter', () => {
    it('lists characters not on the card and adds the chosen one with the keyboard', async () => {
        const props = render();

        await open();
        expect(items()).toEqual(['BEN', 'CY']);
        await userEvent.keyboard('c');
        expect(items()).toEqual(['CY', 'Create “c”']);
        // Typing puts the first match under the keyboard focus.
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => props.onAdd.mock.calls).toEqual([['c-cy']]);
        expect(props.onCreate).not.toHaveBeenCalled();
    });

    it('creates a character from an unknown name, but not from one the script uses', async () => {
        const props = render();

        await open();
        await userEvent.keyboard('Anna');
        expect(document.body.textContent).toContain('No character matches.');
        expect(document.body.textContent).not.toContain('Create');
        await userEvent.clear(requireValue(document.querySelector<HTMLInputElement>('input')));
        await userEvent.keyboard('Harbor master');
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent === 'Create “Harbor master”')));
        expect(props.onCreate).toHaveBeenCalledExactlyOnceWith('Harbor master');
    });

    it('closes on Escape without adding and starts empty next time', async () => {
        const props = render();

        await open();
        await userEvent.keyboard('Be');
        await userEvent.keyboard('{Escape}');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !document.querySelector('input'));
        await open();
        expect(document.querySelector<HTMLInputElement>('input')?.value).toBe('');
        expect(props.onAdd).not.toHaveBeenCalled();
    });
});
