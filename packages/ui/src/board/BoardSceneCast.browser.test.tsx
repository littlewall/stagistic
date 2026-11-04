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
const field = (label: string) => document.querySelector<HTMLElement>(
    `[role="button"][aria-label="${label}"], [role="textbox"][aria-label="${label}"]`,
) ?? undefined;
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

        expect(notes.textContent).toBe('ANNA(in scene)WaitsEVE(not in scene)Only here');
        expect(document.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Characters: BEN, CY');
        expect(button('CY (not in scene)')).toBeDefined();

        // A hollow dot rings inside the edge of a filled one: same box, same border, so the same visible size.
        const filled = getComputedStyle(requireValue(button('BEN (in scene)')?.querySelector('[data-source]')));
        const hollow = getComputedStyle(requireValue(button('CY (not in scene)')?.querySelector('[data-source]')));

        expect(hollow.width).toBe(filled.width);
        expect(hollow.borderTopColor).toBe(filled.borderTopColor);
        expect(hollow.boxShadow).toContain('inset');

        // A sub-card: dot and name on a header line, the note under the name, no line in the margin.
        const rows = [...notes.querySelectorAll<HTMLElement>('[data-source]')].filter(row => row.querySelector('[data-note]'));

        expect(rows).toHaveLength(2);

        for (const row of rows) {
            const dot = requireValue(row.querySelector<HTMLElement>('[aria-hidden="true"]'));
            const name = requireValue(row.querySelector<HTMLElement>('[data-name]'));
            const note = requireValue(row.querySelector<HTMLElement>('[data-note]'));

            expect(getComputedStyle(row).borderLeftWidth).toBe('0px');
            expect(getComputedStyle(name).color).toBe(getComputedStyle(note).color);
            expect(note.getBoundingClientRect().top).toBeGreaterThanOrEqual(name.getBoundingClientRect().bottom - 1);

            const noteTextLeft = note.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(note).paddingLeft);

            expect(Math.abs(noteTextLeft - name.getBoundingClientRect().left)).toBeLessThanOrEqual(1);
            expect(name.getBoundingClientRect().left).toBeGreaterThan(dot.getBoundingClientRect().right - 1);
        }

        expect(getComputedStyle(requireValue(rows[0]?.querySelector('[aria-hidden="true"]'))).backgroundColor)
            .not.toBe(getComputedStyle(requireValue(rows[1]?.querySelector('[aria-hidden="true"]'))).backgroundColor);

        const hollowDot = requireValue(document.querySelector<HTMLElement>('[role="group"] [data-source="card"]'));

        expect(getComputedStyle(hollowDot).backgroundColor).not.toBe(getComputedStyle(requireValue(document.querySelector('[role="group"] [data-source="script"]'))).backgroundColor);
    });

    it('saves a note when the panel closes with Cmd/Ctrl+Enter and drops it on Escape', async () => {
        const {actions} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN (in scene)')));

        const textarea = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea'));

        await expect.poll(() => document.activeElement).toBe(textarea);
        await userEvent.keyboard('Leaves{Enter}for good');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'ben'}), 'Leaves\nfor good');

        await userEvent.click(await waitFor(() => button('BEN (in scene)')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Nope{Escape}');
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledTimes(1);
    });

    it('saves a note when the panel is left by a click outside', async () => {
        const {actions} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN (in scene)')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Leaves');
        await userEvent.click(document.body);
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'ben'}), 'Leaves');
    });

    it('does not save an open draft when the parent rerenders with equivalent props; Escape still discards it', async () => {
        const {actions, rerender} = render([chip('ben')]);

        await userEvent.click(await waitFor(() => button('BEN (in scene)')));

        const textarea = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea'));

        await expect.poll(() => document.activeElement).toBe(textarea);
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

        await userEvent.click(await waitFor(() => button('BEN (in scene)')));
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.keyboard('Kept');
        rerender();
        await waitFor(() => document.querySelector('textarea'));
        await userEvent.click(document.body);
        await waitFor(() => !dialog());
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'ben'}), 'Kept');
    });

    it('takes a card-only character off the card from its hollow dot', async () => {
        const {actions} = render([chip('anna', {note: 'Waits'}), chip('cy', {source: 'card'})]);

        await userEvent.click(await waitFor(() => button('CY (not in scene)')));
        await waitFor(() => dialog());
        expect(dialog()?.textContent).toContain('Not in scene');
        await userEvent.click(await waitFor(() => button('Remove from card')));
        expect(actions.onRemove).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'cy'}));
        expect(actions.onNoteCommit).not.toHaveBeenCalled();
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
        expect(field('Note for ANNA')).toBeUndefined();
        expect(button('Clear note for ANNA')).toBeUndefined();
        expect(document.querySelector('[data-note]')?.textContent).toBe('Waits');
    });

    describe('a note already there', () => {
        const edit = async (label: string) => {
            const target = await waitFor(() => field(label));

            target.focus();
            await userEvent.keyboard('{Enter}');
            await waitFor(() => field(label)?.getAttribute('role') === 'textbox');
        };

        it('edits in place: no row button, no dialog, a plain header', async () => {
            render([chip('anna', {note: 'Waits'})]);

            const target = await waitFor(() => field('Note for ANNA'));
            const notes = requireValue(document.querySelector('[aria-label="Character notes"]'));

            expect(notes.querySelector('[data-name]')?.closest('button')).toBeNull();
            expect(button('ANNA: Waits')).toBeUndefined();
            expect(target.textContent).toBe('Waits');
            await userEvent.click(target);
            await waitFor(() => field('Note for ANNA')?.getAttribute('role') === 'textbox');
            expect(dialog()).toBeNull();
        });

        it('commits the new text on Cmd/Ctrl+Enter and on blur', async () => {
            const {actions} = render([chip('anna', {note: 'Waits'})]);

            await edit('Note for ANNA');
            await userEvent.keyboard('Leaves');
            await userEvent.keyboard('{Control>}{Enter}{/Control}');
            expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'anna'}), 'Leaves');

            await edit('Note for ANNA');
            await userEvent.keyboard('Stays');
            await userEvent.click(document.body);
            expect(actions.onNoteCommit).toHaveBeenCalledTimes(2);
            expect(actions.onNoteCommit).toHaveBeenLastCalledWith(expect.objectContaining({id: 'anna'}), 'Stays');
        });

        it('clears the note when the field is emptied', async () => {
            const {actions} = render([chip('anna', {note: 'Waits'})]);

            await edit('Note for ANNA');
            await userEvent.keyboard('{Backspace}');
            await userEvent.keyboard('{Control>}{Enter}{/Control}');
            expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'anna'}), null);
        });

        it('keeps the old text on Escape', async () => {
            const {actions} = render([chip('anna', {note: 'Waits'})]);

            await edit('Note for ANNA');
            await userEvent.keyboard('Nope{Escape}');
            expect(actions.onNoteCommit).not.toHaveBeenCalled();
            expect(field('Note for ANNA')?.textContent).toBe('Waits');
        });

        it('clears the note with the always visible x', async () => {
            const {actions} = render([chip('anna', {note: 'Waits'}), chip('eve', {note: 'Other'})]);

            const clear = await waitFor(() => button('Clear note for ANNA'));

            expect(getComputedStyle(clear).opacity).toBe('1');
            expect(getComputedStyle(clear).visibility).toBe('visible');

            // At the right end of the header line.
            const header = requireValue(clear.parentElement).getBoundingClientRect();

            expect(header.right - clear.getBoundingClientRect().right).toBeLessThanOrEqual(8);
            await userEvent.click(clear);
            expect(dialog()).toBeNull();
            expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'anna'}), null);
        });

        it('keeps the text on the indent under the name, and the sub-cards apart', async () => {
            render([chip('anna', {note: 'Waits'}), chip('eve', {note: 'Other'})]);

            const notes = await waitFor(() => document.querySelector<HTMLElement>('[aria-label="Character notes"]'));
            const target = requireValue(field('Note for ANNA'));
            const name = requireValue(notes.querySelector<HTMLElement>('[data-name]'));
            const items = [...notes.querySelectorAll('li')];

            expect(Math.abs(target.getBoundingClientRect().left - name.getBoundingClientRect().left)).toBeLessThanOrEqual(1);

            const probe = document.body.appendChild(document.createElement('div'));

            probe.style.paddingLeft = 'var(--space-lg)';
            expect(getComputedStyle(notes).rowGap).toBe(getComputedStyle(probe).paddingLeft);

            const gap = items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().bottom;

            expect(gap).toBeGreaterThanOrEqual(Number.parseFloat(getComputedStyle(notes).rowGap) - 1);
        });
    });
});
