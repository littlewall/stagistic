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

import {BoardToolbar, type BoardToolbarProps} from './BoardToolbar';

let root: Root | null = null;

const waitFor = async <T,>(read: () => T | null | undefined | false): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

const CHARACTERS = [
    {
        id: 'anna',
        name: 'ANNA',
        color: '#cc3344',
        sceneCount: 3,
    },
    {
        id: 'ben',
        name: 'BEN',
        color: '#2266cc',
        sceneCount: 1,
    },
];

const renderToolbar = (props: Partial<BoardToolbarProps> = {}) => {
    const host = document.createElement('div');

    host.style.width = '1000px';
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <BoardToolbar
            lenses={[{id: 'wall', label: 'Wall'}]}
            activeLensId="wall"
            onSelectLens={vi.fn()}
            filterCharacters={CHARACTERS}
            selectedCharacterIds={[]}
            onSelectedCharacterIdsChange={vi.fn()}
            showOnStage
            onShowOnStageChange={vi.fn()}
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

const button = (name: string) => [...document.querySelectorAll<HTMLElement>('button')].find(
    element => element.getAttribute('aria-label') === name || element.textContent?.trim() === name,
);
const rectOf = (name: string) => requireValue(button(name), name).getBoundingClientRect();

describe('BoardToolbar', () => {
    it('keeps the views left and the filter and View buttons right, on one row', async () => {
        renderToolbar();
        await waitFor(() => button('Wall'));

        const [
            wall,
            characters,
            view,
        ] = [
            rectOf('Wall'),
            rectOf('Characters'),
            rectOf('View'),
        ];

        expect(wall.right).toBeLessThan(characters.left);
        expect(characters.right).toBeLessThan(view.left);
        expect(Math.abs(wall.top + wall.height / 2 - (characters.top + characters.height / 2))).toBeLessThan(2);
        expect(document.querySelectorAll('[aria-label="Board options"] button')).toHaveLength(3);
    });

    it('marks the current view with the ink underline and lists only the views it is given', async () => {
        const onSelectLens = vi.fn();

        renderToolbar({
            lenses: [{id: 'wall', label: 'Wall'}, {id: 'matrix', label: 'Matrix'}],
            onSelectLens,
        });

        const wall = await waitFor(() => button('Wall'));
        const matrix = requireValue(button('Matrix'), 'matrix');

        expect(document.querySelector('nav')?.getAttribute('aria-label')).toBe('Board views');
        expect(wall.getAttribute('aria-current')).toBe('page');
        expect(matrix.getAttribute('aria-current')).toBeNull();
        expect(getComputedStyle(wall).borderBottomColor).toBe(getComputedStyle(wall).color);
        expect(getComputedStyle(matrix).borderBottomColor).toBe('rgba(0, 0, 0, 0)');
        expect(button('Arcs')).toBeUndefined();

        await userEvent.click(wall);

        expect(onSelectLens).not.toHaveBeenCalled();

        await userEvent.click(matrix);

        expect(onSelectLens).toHaveBeenCalledWith('matrix');
    });

    it('offers independent positive options in the View panel', async () => {
        const onShowOnStageChange = vi.fn();
        const onShowMentionedChange = vi.fn();

        renderToolbar({
            showOnStage: true,
            showMentioned: false,
            onShowOnStageChange,
            onShowMentionedChange,
        });
        await userEvent.click(await waitFor(() => button('View')));

        const dialog = await waitFor(() => document.querySelector<HTMLElement>('[role="dialog"]'));
        const inputs = [...dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
        const [onStage, mentioned] = inputs.map(input => requireValue(input.closest('label'), 'label'));

        expect(dialog.getAttribute('aria-label')).toBe('Show on cards');
        expect(dialog.textContent).toContain('Show on cards');
        expect(inputs.map(input => input.checked)).toEqual([true, false]);
        expect(inputs.map(input => input.disabled)).toEqual([false, false]);
        expect(onStage?.textContent).toBe('Characters on stage');
        expect(mentioned?.textContent).toBe('Mentioned charactersNamed in dialogue or lyrics only');
        expect(dialog.textContent).not.toContain('Outline');

        const boxLeft = (label: Element) => requireValue(label.querySelector('span'), 'box').getBoundingClientRect().left;

        expect(boxLeft(requireValue(mentioned, 'mentioned'))).toBe(boxLeft(requireValue(onStage, 'on stage')));

        await userEvent.click(requireValue(mentioned, 'mentioned'));

        expect(onShowMentionedChange).toHaveBeenCalledWith(true);

        await userEvent.click(requireValue(onStage, 'on stage'));

        expect(onShowOnStageChange).toHaveBeenCalledWith(false);
    });

    it('keeps the filter control and View button on the same right edges when a filter is set', async () => {
        renderToolbar();
        await waitFor(() => button('Characters'));

        const controlRight = (name: string) => requireValue(button(name)?.parentElement, 'control').getBoundingClientRect().right;
        const before = {filter: controlRight('Characters'), view: rectOf('View').left};

        root?.unmount();
        document.body.innerHTML = '';
        renderToolbar({selectedCharacterIds: ['anna', 'ben']});
        await waitFor(() => button('Clear character filter'));

        expect(controlRight('Characters: ANNA, BEN')).toBe(before.filter);
        expect(rectOf('View').left).toBe(before.view);
    });
});
