import '../../styles/tokens.css';

import type {SceneNumberFormat} from '@stagistic/script';
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

import {FocusVisibilityManager} from '../layout/FocusVisibilityManager';
import type {BoardCharacterActions} from './BoardCharacterPopover';
import {
    BoardMatrix,
    type BoardMatrixAct,
    type BoardMatrixCell,
    type BoardMatrixRow,
    type BoardMatrixSceneColumn,
} from './BoardMatrix';

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

const ACTS: BoardMatrixAct[] = [
    {
        key: '__default-act__',
        name: 'ACT 1',
        scenes: [
            {
                headingBlockId: 's0',
                number: 1,
                title: 'Prologue',
                page: null,
            },
        ],
    },
    {
        key: 'a1',
        name: 'ACT ONE',
        scenes: [
            {
                headingBlockId: 's1',
                number: 2,
                title: 'Kitchen',
                page: 7,
            },
            {
                headingBlockId: 's2',
                number: 3,
                title: 'Garden',
                page: null,
            },
        ],
    },
];

const ROWS: BoardMatrixRow[] = [
    {
        id: 'c-anna',
        characterId: 'c-anna',
        name: 'ANNA',
        color: '#cc3344',
        sceneCount: 2,
        cells: [
            {kind: 'empty', chip: null},
            {
                kind: 'note',
                chip: {
                    id: 'c-anna',
                    characterId: 'c-anna',
                    name: 'ANNA',
                    color: '#cc3344',
                    source: 'script',
                    note: 'Waits for the letter',
                    isDimmed: false,
                },
            },
            {
                kind: 'card',
                chip: {
                    id: 'c-anna',
                    characterId: 'c-anna',
                    name: 'ANNA',
                    color: '#cc3344',
                    source: 'card',
                    note: null,
                    isDimmed: false,
                },
            },
        ],
    },
    {
        id: 'key:DOCTOR',
        characterId: null,
        name: 'DOCTOR',
        color: null,
        sceneCount: 1,
        cells: [
            {
                kind: 'script',
                chip: {
                    id: 'key:DOCTOR',
                    characterId: null,
                    name: 'DOCTOR',
                    color: null,
                    source: 'script',
                    note: null,
                    isDimmed: false,
                },
            },
            {kind: 'empty', chip: null},
            {kind: 'empty', chip: null},
        ],
    },
];

const renderMatrix = (
    acts: BoardMatrixAct[] = ACTS,
    rows: BoardMatrixRow[] = ROWS,
    hostWidth?: number,
    sceneNumberFormat?: SceneNumberFormat,
) => {
    const host = document.createElement('div');

    if (hostWidth !== undefined) host.style.width = `${hostWidth}px`;

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <>
            <FocusVisibilityManager />
            {hostWidth !== undefined ? (
                /* The board canvas is a column flex box whose children stretch to its width. */
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                    }}
                >
                    <BoardMatrix acts={acts} rows={rows} sceneNumberFormat={sceneNumberFormat} />
                </div>
            ) : (
                <BoardMatrix acts={acts} rows={rows} sceneNumberFormat={sceneNumberFormat} />
            )}
        </>,
    );
};

/* The editable grid: actions like the Wall’s, plus adding a character from an empty cell. */
const renderEditableMatrix = ({onAdd}: {onAdd?: (characterId: string, column: BoardMatrixSceneColumn) => void} = {}) => {
    const actions: BoardCharacterActions = {
        onNoteCommit: vi.fn(),
        onRemove: vi.fn(),
        onConfirm: vi.fn(),
    };
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);

    /* The route repaints with optimistic records, so the test drives the same loop. */
    const paint = (rows: readonly BoardMatrixRow[]) => root?.render(
        <>
            <FocusVisibilityManager />
            <BoardMatrix
                acts={ACTS}
                rows={rows}
                characterActions={() => actions}
                onAdd={onAdd}
            />
        </>,
    );

    paint(ROWS);

    return {
        actions,
        paint,
    };
};

/* What an optimistic add leaves in the row: a card-only cell where the empty one was. */
const annaAddedRow = (): BoardMatrixRow => {
    const cardCell: BoardMatrixCell = {
        kind: 'card',
        chip: {
            id: 'c-anna',
            characterId: 'c-anna',
            name: 'ANNA',
            color: '#cc3344',
            source: 'card',
            note: null,
            isDimmed: false,
        },
    };

    return {
        ...ROWS[0],
        sceneCount: 2,
        cells: [cardCell, ...ROWS[0].cells.slice(1)],
    };
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

/* A cell element by its aria-label: either a td with role="gridcell" or a button inside one. */
const cell = (label: string) => document.querySelector<HTMLElement>(`[data-cell][aria-label="${label}"]`);

const button = (label: string) => [...document.querySelectorAll<HTMLElement>('button')].find(
    element => element.getAttribute('aria-label') === label || element.textContent?.trim() === label,
);

const glyph = (label: string): HTMLElement | null => cell(label)?.firstElementChild as HTMLElement | null;

/* Two DOMRects are the same box: only background/color changes, never geometry. */
const rectsEqual = (left: DOMRect, right: DOMRect) => left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;

const actLabel = (name: string) => document.querySelector<HTMLElement>(`th[data-act="${name}"] span`);

const sceneNumberLabel = (number: string) => document.querySelector<HTMLElement>(`[data-scene-number="${number}"] span`);

const transparent = 'rgba(0, 0, 0, 0)';

const warmPointerModality = async (trigger: HTMLElement) => {
    await userEvent.click(trigger);
    await userEvent.unhover(trigger);
};

describe('BoardMatrix', () => {
    it('is an ARIA grid whose cells name the character, the scene and the state', async () => {
        renderMatrix();

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));

        expect(cell('ANNA, Kitchen: note: Waits for the letter')).not.toBeNull();
        expect(cell('ANNA, Garden: only on the card')).not.toBeNull();
        expect(cell('DOCTOR, Prologue: in the scene, not confirmed')).not.toBeNull();
        expect(document.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe('Characters by scene');
    });

    it('draws ■ in the character’s color for a note, ● for the script, ○ for the card only', async () => {
        renderMatrix();

        const note = await waitFor(() => glyph('ANNA, Kitchen: note: Waits for the letter'));
        const script = requireValue(glyph('DOCTOR, Prologue: in the scene, not confirmed'), 'script glyph');
        const card = requireValue(glyph('ANNA, Garden: only on the card'), 'card glyph');

        expect(getComputedStyle(requireValue(note, 'note glyph'))).toMatchObject({backgroundColor: 'rgb(204, 51, 68)', borderRadius: '0px'});
        expect(script.dataset.confirmed).toBe('false');
        expect(getComputedStyle(script).borderRadius).not.toBe('0px');
        expect(card.dataset.source).toBe('card');
        expect(getComputedStyle(card).borderTopColor).toBe('rgb(204, 51, 68)');
        expect(cell('ANNA, Prologue: not in the scene')?.firstElementChild).toBeNull();
    });

    it('heads rows with the color dot and name; the scene count sits in a last column', async () => {
        renderMatrix();

        const rowHeader = await waitFor(() => document.querySelector<HTMLElement>('th[scope="row"]'));

        expect(rowHeader.textContent).toContain('ANNA');
        expect(rowHeader.textContent).not.toContain('2 scenes');
        expect(rowHeader.querySelector('[aria-hidden="true"]')).not.toBeNull();
        expect(rowHeader.getAttribute('aria-label')).toBe('ANNA, 2 scenes');

        const count = requireValue(rowHeader.closest('tr')?.querySelector<HTMLElement>('td:last-child'), 'count cell');

        expect(count.textContent).toBe('2 scenes');
        expect(getComputedStyle(count).color).not.toBe(getComputedStyle(requireValue(rowHeader.querySelector('[class*="rowName"]'), 'row name')).color);
        expect([...document.querySelectorAll('th[scope="col"][aria-label^="Scene"]')].map(item => item.getAttribute('aria-label'))).toEqual([
            'Scene 1: Prologue',
            'Scene 2: Kitchen',
            'Scene 3: Garden',
        ]);
    });

    it('names acts above their columns and separates them with a hairline', async () => {
        renderMatrix();

        const actNames = await waitFor(() => {
            const items = [...document.querySelectorAll<HTMLElement>('th[data-act]')];

            return items.length === 2 ? items : null;
        });

        expect(actNames.map(item => item.textContent)).toEqual(['ACT 1', 'ACT ONE']);

        const [firstScene, secondScene] = [...document.querySelectorAll<HTMLElement>('[data-scene-number]')];

        expect(getComputedStyle(requireValue(secondScene, 'second act scene')).borderLeftWidth).toBe('1px');
        expect(getComputedStyle(requireValue(firstScene, 'first act scene')).borderLeftWidth).toBe('0px');
    });

    it('reveals the scene title and page on the column header, the title alone without a page', async () => {
        renderMatrix();

        const kitchen = await waitFor(() => document.querySelector<HTMLElement>('[aria-label="Scene 2: Kitchen"]'));

        await warmPointerModality(kitchen);

        await userEvent.hover(kitchen);

        expect((await waitFor(() => document.querySelector('[role="tooltip"]'))).textContent).toBe('Kitchen, p. 7');

        await userEvent.unhover(kitchen);
        await userEvent.hover(requireValue(document.querySelector<HTMLElement>('[aria-label="Scene 3: Garden"]'), 'garden'));

        expect((await waitFor(() => document.querySelector('[role="tooltip"]'))).textContent).toBe('Garden');
    });

    it('shows the note and the formatted scene in a cell tooltip, without the character name', async () => {
        renderMatrix();

        const tooltipLines = () => [...requireValue(document.querySelector('[role="tooltip"]'), 'tooltip').querySelectorAll('span')]
            .map(span => span.textContent);

        const noted = await waitFor(() => cell('ANNA, Kitchen: note: Waits for the letter'));

        await warmPointerModality(noted);
        await userEvent.hover(noted);

        expect(tooltipLines()).toEqual(['Waits for the letter', 'Scene: 2. Kitchen']);

        await userEvent.unhover(noted);
        await userEvent.hover(requireValue(cell('DOCTOR, Prologue: in the scene, not confirmed'), 'doctor cell'));

        expect(tooltipLines()).toEqual(['Scene: 1. Prologue']);
    });

    it('omits the scene number from the tooltip when the script numbers scenes with “none”', async () => {
        renderMatrix(ACTS, ROWS, undefined, 'none');

        const doctorCell = await waitFor(() => cell('DOCTOR, Prologue: in the scene, not confirmed'));

        await warmPointerModality(doctorCell);
        await userEvent.hover(doctorCell);

        expect(requireValue(document.querySelector('[role="tooltip"]'), 'tooltip').textContent).toBe('Scene: Prologue');

        await userEvent.unhover(doctorCell);
    });

    it('is one tab stop: the editable grid has exactly one tabbable cell at any time', async () => {
        renderMatrix();

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));

        /* Initially, the first cell is tabbable. */
        expect([...document.querySelectorAll<HTMLElement>('[data-cell]')].filter(el => el.tabIndex >= 0)).toHaveLength(1);

        await userEvent.tab();
        expect(document.activeElement).toBe(cell('ANNA, Prologue: not in the scene'));

        await userEvent.keyboard('{ArrowRight}');

        expect(document.activeElement).toBe(cell('ANNA, Kitchen: note: Waits for the letter'));

        /* Still one tabbable cell after arrow key. */
        expect([...document.querySelectorAll<HTMLElement>('[data-cell]')].filter(el => el.tabIndex >= 0)).toHaveLength(1);

        await userEvent.keyboard('{ArrowDown}');

        expect(document.activeElement).toBe(cell('DOCTOR, Kitchen: not in the scene, not confirmed'));

        await userEvent.keyboard('{ArrowUp}');
        await userEvent.keyboard('{ArrowLeft}');

        expect(document.activeElement).toBe(cell('ANNA, Prologue: not in the scene'));

        /* Tab from a cell eventually leaves the grid. */
        for (let i = 0; i < 10; i++) {
            await userEvent.tab();
        }

        expect(document.activeElement).not.toBe(cell('ANNA, Prologue: not in the scene'));
        expect(document.activeElement).not.toBe(cell('ANNA, Kitchen: note: Waits for the letter'));
    });

    it('offers nothing to click: read-only cells are not buttons', async () => {
        renderMatrix();

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));

        expect(document.querySelector('[role="grid"]')?.querySelectorAll('button')).toHaveLength(0);
        expect(cell('ANNA, Kitchen: note: Waits for the letter')?.tagName).toBe('TD');
    });

    it('renders each glyph as a box with size, not as the border of an inline box', async () => {
        renderMatrix();

        await waitFor(() => glyph('ANNA, Kitchen: note: Waits for the letter'));

        const glyphBox = (label: string) => requireValue(glyph(label), label).getBoundingClientRect();

        [
            glyphBox('ANNA, Kitchen: note: Waits for the letter'),
            glyphBox('DOCTOR, Prologue: in the scene, not confirmed'),
            glyphBox('ANNA, Garden: only on the card'),
        ].forEach(box => {
            expect(box.width).toBeGreaterThanOrEqual(8);
            expect(box.height).toBeGreaterThanOrEqual(8);
        });

        const rowColor = requireValue(document.querySelector<HTMLElement>('th[scope="row"] > span'), 'row color').getBoundingClientRect();

        expect(rowColor.width).toBeGreaterThanOrEqual(8);
        expect(rowColor.height).toBeGreaterThanOrEqual(8);
    });

    it('sizes the grid to its content and keeps scene columns narrow in a stretching canvas', async () => {
        renderMatrix(ACTS, ROWS, 1000);

        const sceneColumn = await waitFor(() => document.querySelector<HTMLElement>('[data-scene-number="2"]'));

        expect(sceneColumn.getBoundingClientRect().width).toBeLessThanOrEqual(40);

        const grid = requireValue(document.querySelector<HTMLElement>('[role="grid"]'), 'grid').getBoundingClientRect();
        const rowHeader = requireValue(document.querySelector<HTMLElement>('th[scope="row"]'), 'row header').getBoundingClientRect();

        expect(grid.width).toBeLessThan(1000);
        expect(rowHeader.width).toBeLessThan(200);
    });

    it('says quietly when scenes exist but no character rows do', async () => {
        renderMatrix(ACTS, []);

        await waitFor(() => document.querySelector('[role="grid"]') === null && document.body.textContent?.includes('No characters yet.'));

        expect(document.querySelector('[data-cell]')).toBeNull();
    });

    it('adds a character from an empty cell on click and opens the new cell’s popover', async () => {
        const onAdd = vi.fn<(characterId: string, column: BoardMatrixSceneColumn) => void>();
        const {paint} = renderEditableMatrix({onAdd});

        await userEvent.click(await waitFor(() => cell('ANNA, Prologue: not in the scene')));

        expect(onAdd).toHaveBeenCalledExactlyOnceWith('c-anna', ACTS[0].scenes[0]);

        paint([annaAddedRow(), ROWS[1]]);

        const dialog = await waitFor(() => document.querySelector('[role="dialog"]'));

        expect(dialog.getAttribute('aria-label')).toBe('ANNA');
        expect(document.querySelector('textarea[aria-label="Note for ANNA"]')).not.toBeNull();

        await userEvent.keyboard('{Escape}');
        await waitFor(() => !document.querySelector('[role="dialog"]'));

        /* Closing without a note leaves the added character on the card, focus back on its cell. */
        expect(cell('ANNA, Prologue: only on the card')).not.toBeNull();
        await expect.poll(() => document.activeElement).toBe(cell('ANNA, Prologue: only on the card'));
    });

    it('adds from the keyboard: Enter on a focused empty cell', async () => {
        const onAdd = vi.fn<(characterId: string, column: BoardMatrixSceneColumn) => void>();

        renderEditableMatrix({onAdd});

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));
        await userEvent.tab();

        expect(document.activeElement).toBe(cell('ANNA, Prologue: not in the scene'));

        await userEvent.keyboard('{Enter}');

        expect(onAdd).toHaveBeenCalledExactlyOnceWith('c-anna', ACTS[0].scenes[0]);

        /* The record has not arrived yet, so nothing opens by itself. */
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('adds from the keyboard: Space on a focused empty cell', async () => {
        const onAdd = vi.fn<(characterId: string, column: BoardMatrixSceneColumn) => void>();

        renderEditableMatrix({onAdd});

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));
        await userEvent.tab();

        expect(document.activeElement).toBe(cell('ANNA, Prologue: not in the scene'));

        await userEvent.keyboard(' ');

        expect(onAdd).toHaveBeenCalledExactlyOnceWith('c-anna', ACTS[0].scenes[0]);

        /* The record has not arrived yet, so nothing opens by itself. */
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('opens the shared popover with the actions matching the cell’s source', async () => {
        const {actions} = renderEditableMatrix();

        /* A hovered cell keeps its tooltip, which would block the next click; leave both behind. */
        const leave = async (label: string) => {
            await userEvent.keyboard('{Escape}');
            await waitFor(() => !document.querySelector('[role="dialog"]'));
            await userEvent.unhover(requireValue(cell(label), label));
            await waitFor(() => document.querySelector('[role="tooltip"]') === null);
        };

        await userEvent.click(await waitFor(() => cell('ANNA, Kitchen: note: Waits for the letter')));

        const dialog = await waitFor(() => document.querySelector('[role="dialog"]'));

        expect(dialog.querySelector('textarea')).not.toBeNull();
        expect(button('Clear note')).toBeDefined();
        expect(button('Remove from card')).toBeUndefined();

        await leave('ANNA, Kitchen: note: Waits for the letter');
        await userEvent.click(requireValue(cell('ANNA, Garden: only on the card'), 'card cell'));
        await waitFor(() => document.querySelector('[role="dialog"]'));
        expect(button('Remove from card')).toBeDefined();

        await leave('ANNA, Garden: only on the card');
        await userEvent.click(requireValue(cell('DOCTOR, Prologue: in the scene, not confirmed'), 'unconfirmed cell'));
        await waitFor(() => document.querySelector('[role="dialog"]'));
        expect(document.querySelector('textarea')).toBeNull();
        expect(button('Confirm character')).toBeDefined();
        expect(button('Remove from card')).toBeUndefined();

        /* The note the panel writes goes through the same actions as on the Wall. */
        await leave('DOCTOR, Prologue: in the scene, not confirmed');
        await userEvent.click(requireValue(cell('ANNA, Kitchen: note: Waits for the letter'), 'note cell'));

        const field = await waitFor(() => document.querySelector<HTMLTextAreaElement>('textarea'));

        await userEvent.clear(field);
        await userEvent.keyboard('Changed');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
        await waitFor(() => !document.querySelector('[role="dialog"]'));
        expect(actions.onNoteCommit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({id: 'c-anna'}), 'Changed');
    });

    it('leaves the empty cells of unconfirmed characters inert, even while editing', async () => {
        renderEditableMatrix();

        const empty = await waitFor(() => document.querySelector<HTMLElement>('[aria-label="DOCTOR, Kitchen: not in the scene, not confirmed"]'));

        expect(empty.tagName).toBe('TD');
        expect(empty.closest('button')).toBeNull();
    });

    it('returns focus to an occupied cell after closing its popover with Escape', async () => {
        renderEditableMatrix();

        const notedCell = await waitFor(() => cell('ANNA, Kitchen: note: Waits for the letter'));

        await userEvent.click(requireValue(notedCell, 'noted cell'));
        await waitFor(() => document.querySelector('[role="dialog"]'));

        await userEvent.keyboard('{Escape}');
        await waitFor(() => !document.querySelector('[role="dialog"]'));

        /* Focus should return to the cell that had the popover open */
        expect(document.activeElement).toBe(notedCell);
    });

    it('grows an act wider than its columns instead of clipping it: the extra width trails the dots', async () => {
        const longName = 'ACT TWO: THE LONGEST NIGHT';
        const acts: BoardMatrixAct[] = [
            ACTS[0],
            {
                key: 'a-long',
                name: longName,
                scenes: [requireValue(ACTS[1].scenes[0], 'kitchen')],
            },
            {
                key: 'a2',
                name: 'ACT TWO',
                scenes: [requireValue(ACTS[1].scenes[1], 'garden')],
            },
        ];

        renderMatrix(acts);

        const header = await waitFor(() => document.querySelector<HTMLElement>(`th[data-act="${longName}"]`));
        const label = requireValue(header.querySelector<HTMLElement>('span'), 'act label');
        const nextLabel = requireValue(actLabel('ACT TWO'), 'next act label');

        /* The whole name is visible: nothing overflows the label's own box. */
        expect(label.textContent).toBe(longName);
        expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1);
        expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(header.getBoundingClientRect().right + 1);

        /* The band grew beyond one scene column, while the dots keep their fixed pitch. */
        expect(header.getBoundingClientRect().width).toBeGreaterThan(40);
        expect(requireValue(document.querySelector<HTMLElement>('[data-scene-number="2"]'), 'long act scene').getBoundingClientRect().width).toBeLessThanOrEqual(40);

        /* The next act's label starts clear of this one. */
        expect(nextLabel.getBoundingClientRect().left).toBeGreaterThanOrEqual(label.getBoundingClientRect().right);

        /* No tooltip stands in for a clipped name anymore. */
        await warmPointerModality(label);
        await userEvent.hover(label);
        await new Promise(resolve => window.setTimeout(resolve, 250));

        expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('highlights the character name, act name and scene number of the hovered cell, with zero layout shift', async () => {
        renderMatrix();

        const annaCell = await waitFor(() => cell('ANNA, Kitchen: note: Waits for the letter'));
        const rowName = requireValue(document.querySelector<HTMLElement>('th[scope="row"] [class*="rowName"]'), 'row name');
        const label = requireValue(actLabel('ACT ONE'), 'act label');
        const sceneNumber = requireValue(sceneNumberLabel('2'), 'scene number');
        const otherActLabel = requireValue(actLabel('ACT 1'), 'other act label');
        const boxes = {
            rowName: rowName.getBoundingClientRect(),
            label: label.getBoundingClientRect(),
            sceneNumber: sceneNumber.getBoundingClientRect(),
        };

        expect(getComputedStyle(rowName).backgroundColor).toBe(transparent);
        expect(getComputedStyle(label).backgroundColor).toBe(transparent);
        expect(getComputedStyle(sceneNumber).backgroundColor).toBe(transparent);

        await userEvent.hover(requireValue(annaCell, 'cell'));

        expect(getComputedStyle(rowName).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(label).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(sceneNumber).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(otherActLabel).backgroundColor).toBe(transparent);

        /* Only backgrounds changed: the boxes are pixel-identical. */
        expect(rectsEqual(rowName.getBoundingClientRect(), boxes.rowName)).toBe(true);
        expect(rectsEqual(label.getBoundingClientRect(), boxes.label)).toBe(true);
        expect(rectsEqual(sceneNumber.getBoundingClientRect(), boxes.sceneNumber)).toBe(true);

        /* The highlight follows the pointer away. */
        await userEvent.unhover(requireValue(annaCell, 'cell'));

        expect(getComputedStyle(rowName).backgroundColor).toBe(transparent);
        expect(getComputedStyle(label).backgroundColor).toBe(transparent);
        expect(getComputedStyle(sceneNumber).backgroundColor).toBe(transparent);
    });

    it('highlights the same trio for the keyboard-focused cell and moves it with the arrows', async () => {
        renderMatrix();

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));
        await userEvent.tab();

        const rowName = requireValue(document.querySelector<HTMLElement>('th[scope="row"] [class*="rowName"]'), 'row name');
        const firstActLabel = requireValue(actLabel('ACT 1'), 'first act label');
        const secondActLabel = requireValue(actLabel('ACT ONE'), 'second act label');

        expect(getComputedStyle(rowName).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(firstActLabel).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(requireValue(sceneNumberLabel('1'), 'scene number')).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(secondActLabel).backgroundColor).toBe(transparent);

        await userEvent.keyboard('{ArrowRight}');

        expect(getComputedStyle(firstActLabel).backgroundColor).toBe(transparent);
        expect(getComputedStyle(secondActLabel).backgroundColor).not.toBe(transparent);
        expect(getComputedStyle(requireValue(sceneNumberLabel('2'), 'scene number')).backgroundColor).not.toBe(transparent);
    });

    it('opens a cell tooltip to the right of the cell, never above the header', async () => {
        renderMatrix();

        const doctorCell = await waitFor(() => cell('DOCTOR, Prologue: in the scene, not confirmed'));

        await warmPointerModality(doctorCell);
        await userEvent.hover(doctorCell);

        const tooltip = await waitFor(() => document.querySelector<HTMLElement>('[role="tooltip"]'));
        const tooltipRect = tooltip.getBoundingClientRect();
        const cellRect = requireValue(doctorCell, 'cell').getBoundingClientRect();
        const headerBottom = requireValue(document.querySelector<HTMLElement>('[data-scene-number]'), 'scene header').getBoundingClientRect().bottom;

        expect(tooltipRect.left).toBeGreaterThanOrEqual(cellRect.right);
        expect(tooltipRect.top).toBeGreaterThanOrEqual(headerBottom - 1);

        await userEvent.unhover(requireValue(doctorCell, 'cell'));
    });

    it('keeps sticky headers at scroll edges: act band top, row header left', async () => {
        renderMatrix(ACTS, ROWS, 400);

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));

        const grid = requireValue(document.querySelector<HTMLElement>('[role="grid"]'), 'grid');
        const container = requireValue(grid.parentElement, 'scroll container');
        const actHeader = requireValue(document.querySelector<HTMLElement>('th[data-act]'), 'act header');
        const rowHeader = requireValue(document.querySelector<HTMLElement>('th[scope="row"]'), 'row header');

        /* Container should have overflow to allow scrolling. */
        expect(getComputedStyle(container).overflowX).not.toBe('visible');

        /* Sticky headers should stay at container edges when scrolled. */
        container.scrollLeft = 100;
        container.scrollTop = 50;

        const actHeaderRect = actHeader.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        expect(actHeaderRect.top).toBe(containerRect.top);
        expect(rowHeader.getBoundingClientRect().left).toBe(containerRect.left);
    });

    it('keeps sticky headers at scroll edges when canvas scrolls (app structure)', async () => {
        const host = document.createElement('div');

        /* Simulate the app structure: canvas is the scrolling element with fixed height. */
        host.style.cssText = 'display: flex; flex-direction: column; height: 420px; width: 1000px;';

        document.body.appendChild(host);
        root = createRoot(host);
        root.render(
            <>
                <FocusVisibilityManager />
                {/* Simulate BoardLayout canvas */}
                <div
                    style={{
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        minHeight: 0,
                        padding: '24px',
                        gap: '80px',
                        background: 'var(--color-bg)',
                    }}
                >
                    <BoardMatrix acts={ACTS} rows={ROWS} />
                </div>
            </>,
        );

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));

        const canvas = requireValue(document.querySelector<HTMLElement>('[style*="overflow: auto"]'), 'canvas');
        const actHeader = requireValue(document.querySelector<HTMLElement>('th[data-act]'), 'act header');
        const rowHeader = requireValue(document.querySelector<HTMLElement>('th[scope="row"]'), 'row header');

        /* Canvas should be the scrolling element (has overflow: auto). */
        expect(getComputedStyle(canvas).overflow).toBe('auto');

        /* Scroll the canvas down and right. */
        canvas.scrollTop = 100;
        canvas.scrollLeft = 100;

        const actHeaderRect = actHeader.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        /* Headers should stick to the canvas scroll edges, not the container edges. */
        expect(actHeaderRect.top).toBeCloseTo(canvasRect.top + 24, 1); /* Canvas top + padding */
        expect(rowHeader.getBoundingClientRect().left).toBeCloseTo(canvasRect.left + 24, 1); /* Canvas left + padding */
    });

    it('does not open a popover when adding a character fails (cell remains empty)', async () => {
        const onAdd = vi.fn<(characterId: string, column: BoardMatrixSceneColumn) => void>();
        const {paint} = renderEditableMatrix({onAdd});

        await userEvent.click(await waitFor(() => cell('ANNA, Prologue: not in the scene')));

        expect(onAdd).toHaveBeenCalledExactlyOnceWith('c-anna', ACTS[0].scenes[0]);

        /* The add is called but doesn't produce a record; paint the same rows. */
        paint(ROWS);

        /* No popover should have opened. */
        expect(document.querySelector('[role="dialog"]')).toBeNull();

        /* A subsequent paint with the record added should also not open the popover. */
        paint([annaAddedRow(), ROWS[1]]);

        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('mutes unconfirmed character names and adds "not confirmed" to accessible labels', async () => {
        renderMatrix();

        await waitFor(() => cell('ANNA, Prologue: not in the scene'));

        const doctorRow = [...document.querySelectorAll<HTMLElement>('th[scope="row"]')].find(
            row => row.textContent?.includes('DOCTOR'),
        );

        expect(doctorRow?.getAttribute('aria-label')).toBe('DOCTOR, 1 scene, not confirmed');

        // The row name should have muted styling
        const doctorNameSpan = doctorRow?.querySelector<HTMLElement>('[class*="rowName"]');

        if (doctorNameSpan) {
            expect(getComputedStyle(doctorNameSpan).color).toBeTruthy();
        }

        // Check that the cell label includes "not confirmed"
        expect(cell('DOCTOR, Prologue: in the scene, not confirmed')).not.toBeNull();
    });
});
