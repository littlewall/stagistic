import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {BoardToolbar, type BoardToolbarProps} from './BoardToolbar';

let root: Root | null = null;

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

const OPTIONS = [{id: 'anna', label: 'ANNA'}, {id: 'ben', label: 'BEN'}];

const renderToolbar = (props: Partial<BoardToolbarProps> = {}) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <BoardToolbar
            characterOptions={OPTIONS}
            selectedCharacterIds={[]}
            onSelectedCharacterIdsChange={vi.fn()}
            density="characters"
            onDensityChange={vi.fn()}
            showMentioned
            onShowMentionedChange={vi.fn()}
            {...props}
        />,
    );
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

const button = (name: string) => requireValue(
    [...document.querySelectorAll<HTMLElement>('button')].find(element => element.getAttribute('aria-label') === name || element.textContent === name),
    name,
);

describe('BoardToolbar', () => {
    it('keeps one name for the Mentioned toggle and reports its pressed state', async () => {
        const onShowMentionedChange = vi.fn<(show: boolean) => void>();

        const Harness = () => {
            const [show, setShow] = useState(true);

            return (
                <BoardToolbar
                    characterOptions={OPTIONS}
                    selectedCharacterIds={[]}
                    onSelectedCharacterIdsChange={vi.fn()}
                    density="characters"
                    onDensityChange={vi.fn()}
                    showMentioned={show}
                    onShowMentionedChange={next => {
                        onShowMentionedChange(next);
                        setShow(next);
                    }}
                />
            );
        };
        const host = document.createElement('div');

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(<Harness />);

        await waitForElement('button[aria-label="Mentioned"]');

        expect(button('Mentioned').getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(button('Mentioned'));

        expect(onShowMentionedChange).toHaveBeenLastCalledWith(false);
        expect(button('Mentioned').getAttribute('aria-pressed')).toBe('false');
        expect(button('Mentioned').getAttribute('aria-label')).toBe('Mentioned');
    });

    it('switches card density', async () => {
        const onDensityChange = vi.fn();

        renderToolbar({onDensityChange});
        await waitForElement('button[aria-label="Title"]');

        expect(button('Characters').getAttribute('aria-pressed') ?? button('Characters').getAttribute('aria-checked')).not.toBeNull();

        await userEvent.click(button('Title'));

        expect(onDensityChange).toHaveBeenCalledWith('title');
    });

    it('disables Mentioned while cards show titles only', async () => {
        renderToolbar({density: 'title'});
        await waitForElement('button[aria-label="Mentioned"]');

        expect(button('Mentioned').hasAttribute('disabled')).toBe(true);
    });

    it('lists the selected filter characters', async () => {
        renderToolbar({selectedCharacterIds: ['ben']});
        await waitForElement('button[aria-label="Remove BEN"]');

        expect(document.body.textContent).toContain('BEN');
        expect(document.body.textContent).not.toContain('ANNA');
        expect(document.querySelector('label')?.textContent).toBe('Characters');
    });

    it('reports a removed filter character', async () => {
        const onSelectedCharacterIdsChange = vi.fn();

        renderToolbar({selectedCharacterIds: ['ben', 'anna'], onSelectedCharacterIdsChange});
        await userEvent.click(await waitForElement('button[aria-label="Remove BEN"]'));

        expect(onSelectedCharacterIdsChange).toHaveBeenCalledWith(['anna']);
    });
});
