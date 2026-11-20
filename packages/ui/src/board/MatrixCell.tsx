import clsx from 'clsx';
import type {ReactNode} from 'react';
import {memo} from 'react';
import {Button as RACButton} from 'react-aria-components';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import type {BoardCharacterActions} from './BoardCharacterPopover';
import {BoardCharacterPopover} from './BoardCharacterPopover';
import type {
    BoardMatrixCell,
    BoardMatrixRow,
    BoardMatrixSceneColumn,
} from './BoardMatrix';
import styles from './BoardMatrix.module.css';
import {CellGlyph} from './CellGlyph';

interface MatrixCellProps {
    cell: BoardMatrixCell,
    row: BoardMatrixRow,
    column: {scene: BoardMatrixSceneColumn, isActStart: boolean},
    isFocusStop: boolean,
    cellName: string,
    cellTooltip: ReactNode,
    cellStopProps: {
        tabIndex: number,
        'data-cell': string,
        onFocus: () => void,
    },
    characterActions?: BoardCharacterActions,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    onAdd?: (column: BoardMatrixSceneColumn) => void,
    trackOpenButton: (id: string) => (element: HTMLElement | null) => void,
}

/**
 * One cell of the matrix: static gridcell for read-only or unaddable, or a button with popover.
 */
export const MatrixCell = memo(({
    cell,
    row,
    column,
    isFocusStop,
    cellName,
    cellTooltip,
    cellStopProps,
    characterActions,
    isOpen,
    onOpenChange,
    onAdd,
    trackOpenButton,
}: MatrixCellProps): ReactNode => {
    const headingBlockId = column.scene.headingBlockId;
    const id = `${row.id}::${headingBlockId}`;
    const isInteractive = cell.chip
        ? characterActions !== undefined
        : onAdd !== undefined && row.characterId !== null;

    /* Beside the cell, never above it: the tooltip must not cover the act and scene headers. */
    if (!isInteractive) {
        return (
            <Tooltip
                label={cellTooltip}
                placement="right"
                delay={200}
            >
                <td

                    aria-label={cellName}
                    {...cellStopProps}
                    className={clsx(styles.cell, column.isActStart && styles.actStart)}
                >
                    <CellGlyph cell={cell} />
                </td>
            </Tooltip>
        );
    }

    if (cell.chip && characterActions) {
        return (
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- child is a popover-triggering button
            <td key={headingBlockId} className={clsx(styles.cell, column.isActStart && styles.actStart)}>
                <BoardCharacterPopover
                    chip={cell.chip}
                    actions={characterActions}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                >
                    <Tooltip label={cellTooltip} placement="right" delay={200}>
                        <RACButton
                            ref={trackOpenButton(id)}
                            className={styles.cellButton}
                            aria-label={cellName}
                            data-cell={cellStopProps['data-cell']}
                            onFocus={cellStopProps.onFocus}
                            excludeFromTabOrder={!isFocusStop}
                        >
                            <CellGlyph cell={cell} />
                        </RACButton>
                    </Tooltip>
                </BoardCharacterPopover>
            </td>
        );
    }

    return (
        <td key={headingBlockId} className={clsx(styles.cell, column.isActStart && styles.actStart)}>
            <Tooltip label={cellTooltip} placement="right" delay={200}>
                {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- The RACButton has aria-label */}
                <RACButton
                    ref={trackOpenButton(id)}
                    className={styles.cellButton}
                    aria-label={cellName}
                    data-cell={cellStopProps['data-cell']}
                    onFocus={cellStopProps.onFocus}
                    onPress={() => {
                        onAdd?.(column.scene);
                    }}
                    excludeFromTabOrder={!isFocusStop}
                />
            </Tooltip>
        </td>
    );
});

MatrixCell.displayName = 'MatrixCell';
