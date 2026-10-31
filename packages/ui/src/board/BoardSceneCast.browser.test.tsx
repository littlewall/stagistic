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

import type {BoardCharacterChip} from './BoardCharacterDot';
import type {BoardCharacterActions} from './BoardCharacterPopover';
import {BoardSceneCast} from './BoardSceneCast';

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

const chip = (id: string, overrides: Partial<BoardCharacterChip> = {}): BoardCharacterChip => ({
    id,
    characterId: id,
    name: id.toUpperCase(),
    color: '#cc3344',
    source: 'script',
    note: null,
    ...overrides,
});

const render = (characters: BoardCharacterChip[], withActions = true) => {
    const actions: BoardCharacterActions = {
        onNoteCommit: vi.fn(),
        onRemove: vi.fn(),
        onConfirm: vi.fn(),
    };
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);

    /* The Wall rebuilds the chips and the actions object on every parent render. */
    const paint = (chips: BoardCharacterChip[]) => root?.render(
        <BoardSceneCast
            characters={chips.map(item => ({...item}))}
            actions={withActions ? {...actions} : undefined}
        />,
    );

    paint(characters);

    return {
        actions,
        rerender: () => paint(characters),
    };
};

const button = (label: string) => [...document.querySelectorAll<HTMLElement>('button')].find(item => item.getAttribute('aria-label') === label || item.textContent === label);
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('BoardSceneCast', () => {
    it('writes noted characters as lines and the rest as dots, a card-only one hollow', async () => {
        render([
            chip('anna', {note: 'Waits'}),
            chip('eve', {source: 'card', note: 'Only here'}),
            chip('ben'),
            chip('cy', {source: 'card'}),
        ]);

        const notes = await waitFor(() => document.querySelector('[aria-label="Character notes"]'));

        expect(notes.textContent).toBe('ANNAWaitsEVEOnly here');
        expect(document.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Characters: BEN, CY');
        expect(button('CY, only on the card')).toBeDefined();

        const hollow = requireValue(document.querySelector<HTMLElement>('[role="group"] [data-source="card"]'));

        expect(getComputedStyle(hollow).backgroundColor).not.toBe(getComputedStyle(requireValue(document.querySelector('[role="group"] [data-source="script"]'))).backgroundColor);
    });

    it('saves a note when the panel closes with Cmd/Ctrl+Enter and drops it on Escape', async () => {
        const {actions} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN')));

        const field = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea'));

        await expect.poll(() => document.activeElement).toBe(field);
        await userEvent.keyboard('Leaves{Enter}for good');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'ben'}), 'Leaves\nfor good');

        await userEvent.click(await waitFor(() => button('BEN')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Nope{Escape}');
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledTimes(1);
    });

    it('saves a note when the panel is left by a click outside', async () => {
        const {actions} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Leaves');
        await userEvent.click(document.body);
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'ben'}), 'Leaves');
    });

    it('does not save an open draft when the parent rerenders with equivalent props; Escape still discards it', async () => {
        const {actions, rerender} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN')));

        const field = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea'));

        await expect.poll(() => document.activeElement).toBe(field);
        await userEvent.keyboard('Fresh props');
        rerender();
        await waitFor(() => document.querySelector('textarea'));
        expect(actions.onNoteCommit).not.toHaveBeenCalled();

        await userEvent.keyboard('{Escape}');
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).not.toHaveBeenCalled();
    });

    it('saves exactly once when the panel closes normally after a rerender with equivalent props', async () => {
        const {actions, rerender} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Kept');
        rerender();
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.click(document.body);
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'ben'}), 'Kept');
    });

    it('drops the edit when Escape reaches the panel from a footer button', async () => {
        const {actions} = render([chip('anna', {note: 'Waits'})]);

        await userEvent.click(await waitFor(() => button('ANNA: Waits')));

        const field = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea'));

        await expect.poll(() => document.activeElement).toBe(field);
        await userEvent.keyboard('Changed');
        await userEvent.keyboard('{Tab}');
        await expect.poll(() => document.activeElement).toBe(button('Clear note'));
        await userEvent.keyboard('{Escape}');
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).not.toHaveBeenCalled();
    });

    it('takes only a card-only character off the card, and clears the note of one in the script', async () => {
        const {actions} = render([chip('anna', {note: 'Waits'}), chip('cy', {source: 'card'})]);

        await userEvent.click(await waitFor(() => button('ANNA: Waits')));
        await waitFor(() => dialog());
        expect(button('Remove from card')).toBeUndefined();
        await userEvent.click(await waitFor(() => button('Clear note')));
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'anna'}), null);

        await userEvent.click(await waitFor(() => button('CY, only on the card')));
        await waitFor(() => dialog());
        expect(dialog()?.textContent).toContain('Only on this card');
        await userEvent.click(await waitFor(() => button('Remove from card')));
        expect(actions.onRemove).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'cy'}));
        expect(actions.onNoteCommit).toHaveBeenCalledTimes(1);
    });

    it('offers only confirmation for an unconfirmed character', async () => {
        const {actions} = render([
            chip('key:DOCTOR', {
                characterId: null,
                name: 'DOCTOR',
                color: null,
            }),
        ]);

        await userEvent.click(await waitFor(() => button('DOCTOR, not confirmed')));
        await waitFor(() => dialog());
        expect(document.querySelector('textarea')).toBeNull();
        await userEvent.click(await waitFor(() => button('Confirm character')));
        expect(actions.onConfirm).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({name: 'DOCTOR'}));
    });

    it('opens nothing on a read-only Board', async () => {
        render([chip('anna', {note: 'Waits'}), chip('ben')], false);

        await waitFor(() => document.querySelector('[aria-label="Character notes"]'));
        expect(button('ANNA: Waits')).toBeUndefined();
        expect(button('Characters: BEN')).toBeDefined();
    });
});
