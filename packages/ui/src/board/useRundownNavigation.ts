import type {KeyboardEvent} from 'react';
import {useState} from 'react';

const TARGETS: Readonly<Record<string, (index: number, count: number) => number>> = {
    ArrowUp: index => index - 1,
    ArrowDown: index => index + 1,
    Home: () => 0,
    End: (_index, count) => count - 1,
};

/* The list's roving focus: one tab stop, arrows and Home/End between the rows in reading order. */
export const useRundownNavigation = (rowCount: number) => {
    const [stop, setStop] = useState(0);
    /* A filter can shorten the list under the stop; it stays inside. */
    const focus = Math.max(0, Math.min(stop, rowCount - 1));

    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        const target = TARGETS[event.key];

        if (!target || !(event.target as HTMLElement).closest('[data-row]')) return;

        event.preventDefault();

        const next = Math.max(0, Math.min(target(focus, rowCount), rowCount - 1));

        setStop(next);
        event.currentTarget.querySelector<HTMLElement>(`[data-row="${next}"]`)?.focus();
    };

    const rowStopProps = (rowIndex: number) => ({
        tabIndex: rowIndex === focus ? 0 : -1,
        'data-row': rowIndex,
        onFocus: () => setStop(rowIndex),
    });

    return {rowStopProps, listProps: {onKeyDown}};
};
