import type {
    FocusEvent,
    KeyboardEvent,
    MouseEvent,
} from 'react';
import {useState} from 'react';

/* Arrows move between cells; Enter and Space belong to the cell buttons themselves. */
const MOVES: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
};

const parseCellId = (id: string | undefined): [number, number] => {
    const [row, column] = (id ?? '').split(':');

    return [Number(row) || 0, Number(column) || 0];
};

const cellFromTarget = (target: EventTarget | null): [number, number] | null => {
    const element = (target as HTMLElement | null)?.closest<HTMLElement>('[data-cell]');

    return element ? parseCellId(element.dataset.cell) : null;
};

const isSameCell = (left: [number, number] | null, right: [number, number] | null) => (left === null && right === null)
    || (left !== null && right !== null && left[0] === right[0] && left[1] === right[1]);

/** What every cell carries to sit in the roving focus, wherever the stop happens to be. */
export interface MatrixCellStopProps {
    tabIndex: number,
    'data-cell': string,
    onFocus: () => void,
}

/*
 * The grid's roving focus (one tab stop, arrows between cells) and the highlight that
 * follows the hovered or focused cell onto its row's name, its act's name and its scene
 * number. The hovered cell wins over the focused one while the pointer rests on the grid.
 */
export const useMatrixNavigation = ({
    rowCount,
    columnCount,
    actIndexByScene,
}: {
    rowCount: number,
    columnCount: number,
    /** Which act each scene column belongs to, for the act-name highlight. */
    actIndexByScene: readonly number[],
}) => {
    const [focusCell, setFocusCell] = useState<[number, number]>([0, 0]);
    const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
    const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);

    /* A filter can shorten the grid under the focused cell; the stop stays inside it. */
    const focus: [number, number] = [
        Math.min(focusCell[0], rowCount - 1),
        Math.min(focusCell[1], columnCount - 1),
    ];
    const highlightCell = hoverCell ?? focusedCell;
    const highlightColumnIndex = highlightCell?.[1] ?? -1;

    const onKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
        const move = MOVES[event.key];

        if (!move) return;

        const current = (event.target as HTMLElement).closest<HTMLElement>('[data-cell]');

        if (!current) return;

        event.preventDefault();

        const next: [number, number] = [
            focus[0] + move[0],
            focus[1] + move[1],
        ];

        if (next[0] < 0 || next[0] >= rowCount || next[1] < 0 || next[1] >= columnCount) return;

        setFocusCell(next);
        event.currentTarget.querySelector<HTMLElement>(`[data-cell="${next[0]}:${next[1]}"]`)?.focus();
    };

    const onMouseOver = (event: MouseEvent<HTMLTableElement>) => {
        const next = cellFromTarget(event.target);

        if (!isSameCell(hoverCell, next)) setHoverCell(next);
    };

    const onFocus = (event: FocusEvent<HTMLTableElement>) => {
        const next = cellFromTarget(event.target);

        if (next) setFocusedCell(next);
    };

    const cellStopProps = (rowIndex: number, columnIndex: number): MatrixCellStopProps => ({
        tabIndex: rowIndex === focus[0] && columnIndex === focus[1] ? 0 : -1,
        'data-cell': `${rowIndex}:${columnIndex}`,
        onFocus: () => setFocusCell([rowIndex, columnIndex]),
    });

    return {
        focus,
        highlightRowIndex: highlightCell?.[0] ?? -1,
        highlightColumnIndex,
        highlightActIndex: highlightColumnIndex >= 0 ? actIndexByScene[highlightColumnIndex] ?? -1 : -1,
        cellStopProps,
        /* Spread onto the table: every cell event is delegated from there. */
        tableProps: {
            onKeyDown,
            onMouseOver,
            onMouseLeave: () => setHoverCell(null),
            onFocus,
            onBlur: () => setFocusedCell(null),
        },
    };
};
