import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {
    createRoot, type Root,
} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {linkCharacterRef} from './characterRefCommands';

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

    root.render(
        <ScriptEditor document={{initialValue}} layout={{autoFocus: true}}>
            <ScriptEditor.LeftSidebar>
                <ConfirmCharacterButton />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    mountedRoots.push(root);
};

const ConfirmCharacterButton = () => {
    const editor = useEditorInstance();

    return (
        <button
            data-testid="confirm-anna"
            type="button"
            onClick={() => {
                if (editor) {
                    linkCharacterRef(editor, 'ANNA', 'anna-id');
                }
            }}
        >Confirm Anna
        </button>
    );
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
    document.documentElement.removeAttribute('data-theme');
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

    it('keeps the character block DOM stable when confirming its pill', async () => {
        renderEditor(characterDoc());

        const pendingTag = await poll(
            () => document.querySelector<HTMLElement>('[data-character-key="ANNA"]'),
            'unconfirmed character tag',
        );
        const originalBlock = pendingTag.closest('p');
        const confirmButton = await poll(
            () => document.querySelector<HTMLButtonElement>('[data-testid="confirm-anna"]'),
            'confirm character button',
        );

        confirmButton.click();

        const confirmedTag = await poll(
            () => document.querySelector<HTMLElement>('[data-character-id="anna-id"]'),
            'confirmed character tag',
        );

        expect(confirmedTag.closest('p')).toBe(originalBlock);
    });

    it('renders dark-mode script paper distinctly from the editor surface', async () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        renderEditor(characterDoc());

        const canvas = await poll(
            () => document.querySelector<HTMLElement>('[data-editor-scroll-container="true"]'),
            'editor canvas',
        );
        const editorRoot = canvas.closest<HTMLElement>('[data-character-highlight]');

        if (!editorRoot) {
            throw new Error('Expected editor root');
        }

        const getRelativeLuminance = (element: HTMLElement) => {
            const context = document.createElement('canvas').getContext('2d');

            if (!context) {
                throw new Error('Expected canvas context');
            }

            context.canvas.width = 1;
            context.canvas.height = 1;
            context.fillStyle = getComputedStyle(element).backgroundColor;
            context.fillRect(0, 0, 1, 1);

            const [
                red,
                green,
                blue,
            ] = context.getImageData(0, 0, 1, 1).data;
            const channels = [
                red,
                green,
                blue,
            ].map(value => {
                const normalized = value / 255;

                return normalized <= 0.04045
                    ? normalized / 12.92
                    : ((normalized + 0.055) / 1.055) ** 2.4;
            });

            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };

        expect(getRelativeLuminance(canvas) - getRelativeLuminance(editorRoot))
            .toBeGreaterThan(0.01);
    });
});
