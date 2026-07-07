import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {
    createRoot, type Root,
} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import ScriptEditor from '../../Editor';

/*
 * A character (cue) block: the runtime decorates each name token with the
 * shared `.characterTag` class. No persistent character records, so the tokens
 * stay unconfirmed (dashed underline) — deterministic without extra setup.
 */
const characterDoc = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'character',
            attrs: {id: 'ch-1'},
            content: [{type: 'text', text: 'ANNA / BOB'}],
        },
    ],
});

const mountedRoots: Root[] = [];

const renderEditor = (initialValue: ScriptDocument) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(<ScriptEditor document={{initialValue}} layout={{autoFocus: true}} />);
    mountedRoots.push(root);
};

const poll = async <T, >(get: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = get();

        if (value) {
            return value;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Timed out waiting for ${label}`);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('character tag highlight (underline mode)', () => {
    it('marks the editor root with the default highlight mode', async () => {
        renderEditor(characterDoc());

        const root = await poll(
            () => document.querySelector('[data-character-highlight]'),
            'highlight root',
        );

        expect(root.getAttribute('data-character-highlight')).toBe('underline');
    });

    it('underlines names with zero horizontal padding so the grid is unshifted', async () => {
        renderEditor(characterDoc());

        const tag = await poll(
            () => document.querySelector('[data-character-key="ANNA"]'),
            'character tag',
        ) as HTMLElement;
        const style = getComputedStyle(tag);

        expect(style.textDecorationLine).toContain('underline');
        expect(style.paddingLeft).toBe('0px');
        expect(style.paddingRight).toBe('0px');
    });

    it('renders unconfirmed names with a dashed underline', async () => {
        renderEditor(characterDoc());

        const tag = await poll(
            () => document.querySelector('[data-character-key="BOB"]:not([data-character-id])'),
            'unconfirmed character tag',
        ) as HTMLElement;

        expect(getComputedStyle(tag).textDecorationStyle).toBe('dashed');
    });
});
