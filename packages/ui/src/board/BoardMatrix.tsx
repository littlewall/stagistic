import {
    DEFAULT_SCENE_NUMBER_FORMAT,
    formatSceneNumber,
    type SceneNumberFormat,
} from '@stagistic/script';
import clsx from 'clsx';
import type {ReactNode} from 'react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {Text} from '../primitives/Text/Text';
import {type BoardCharacterChip, SCENE_STATE_TEXT} from './BoardCharacterDot';
import {type BoardCharacterActions} from './BoardCharacterPopover';
import styles from './BoardMatrix.module.css';
import {ColorDot} from './ColorDot';
import {MatrixCell} from './MatrixCell';
import {MatrixHeader} from './MatrixHeader';
import {useActGaps} from './useActGaps';
import {useMatrixNavigation} from './useMatrixNavigation';

/** What one cell of the matrix says about a character in a scene. */
export type BoardMatrixCellKind = 'note' | 'script' | 'card' | 'empty';

export interface BoardMatrixCell {
    kind: BoardMatrixCellKind,
    /** Null when the character is not on the scene's card; otherwise it feeds the shared popover. */
    chip: BoardCharacterChip | null,
}

/** One character across every scene column. */
export interface BoardMatrixRow {
    /** The character id, or `key:<KEY>` for an unconfirmed character. */
    id: string,
    /** Null for a character the script has not confirmed. */
    characterId: string | null,
    name: string,
    /** Character color; null for a character the script has not confirmed. */
    color: string | null,
    /** Scenes the character is on, counted like the character filter counts them. */
    sceneCount: number,
    /** One cell per scene column, across all acts in order. */
    cells: readonly BoardMatrixCell[],
}

/** One scene column: the header shows its number; the title and page live in its tooltip. */
export interface BoardMatrixSceneColumn {
    headingBlockId: string,
    number: number,
    title: string,
    /** Start page; null until pagination has been measured. */
    page: number | null,
}

export interface BoardMatrixAct {
    /** Unique per section; the act heading id, or a fixed key for the default act. */
    key: string,
    name: string,
    scenes: readonly BoardMatrixSceneColumn[],
}

export interface BoardMatrixProps {
    /** Scene columns grouped by act, as `buildMatrixView` returns them. */
    acts: readonly BoardMatrixAct[],
    /** Character rows, as `buildMatrixView` returns them. */
    rows: readonly BoardMatrixRow[],
    /** Character actions of one scene, like the Wall's cards pass them; omitted on a read-only Board. */
    characterActions?: (headingBlockId: string) => BoardCharacterActions,
    /** Puts a confirmed character on a scene card from an empty cell; omitted on a read-only Board. */
    onAdd?: (characterId: string, column: BoardMatrixSceneColumn) => void,
    /** How the script numbers its scenes, as the Editor renders it; feeds the cell tooltips. */
    sceneNumberFormat?: SceneNumberFormat,
}

const CELL_STATE: Record<BoardMatrixCellKind, (cell: BoardMatrixCell) => string> = {
    note: cell => `note: ${cell.chip?.note ?? ''}${cell.chip ? ` (${SCENE_STATE_TEXT[cell.chip.source]})` : ''}`,
    script: () => SCENE_STATE_TEXT.script,
    card: () => SCENE_STATE_TEXT.card,
    empty: () => 'not on the card',
};

const sceneCountText = (count: number) => `${count} ${count === 1 ? 'scene' : 'scenes'}`;

/** A scene column of the grid, or the trailing gap that carries an act name's extra width. */
export type MatrixColumn =
    | {
        kind: 'scene',
        scene: BoardMatrixSceneColumn,
        actIndex: number,
        /** Index among all scene columns; the coordinate the roving focus uses. */
        sceneIndex: number,
        isActStart: boolean,
    }
    | {kind: 'gap', width: number};

/**
 * The Matrix lens: characters as rows, scenes as columns grouped by act, one glyph per
 * cell. Read-only the cells are plain gridcells; with actions an occupied cell opens the
 * shared popover and an empty cell adds the character, then opens the popover of the new
 * cell. The row header stays pinned left and the act and scene headers stay pinned above
 * while the grid scrolls. An act whose name is wider than its scenes grows a gap after
 * its last scene column instead of clipping.
 */
export const BoardMatrix = ({
    acts,
    rows,
    characterActions,
    onAdd,
    sceneNumberFormat = DEFAULT_SCENE_NUMBER_FORMAT,
}: BoardMatrixProps) => {
    const sceneColumnCount = acts.reduce((count, act) => count + act.scenes.length, 0);

    /* Only one popover is ever open: the cell the last open belongs to. */
    const [openCellId, setOpenCellId] = useState<string | null>(null);

    /*
     * An add replaces the pressed button with its popover's trigger, so react-aria would
     * restore the focus to a node that no longer exists; the matrix keeps the new one.
     */
    const openButtons = useRef(new Map<string, HTMLElement>());
    const pendingRestoreRef = useRef<string | null>(null);
    const rAFRef = useRef<number | null>(null);

    const {actGaps, gridRef} = useActGaps(acts);

    const {columns, actIndexByScene} = useMemo(() => {
        const builtColumns: MatrixColumn[] = [];
        const actIndexes: number[] = [];

        acts.forEach((act, actIndex) => {
            act.scenes.forEach((scene, sceneIndex) => {
                builtColumns.push({
                    kind: 'scene',
                    scene,
                    actIndex,
                    sceneIndex: actIndexes.length,
                    isActStart: actIndex > 0 && sceneIndex === 0,
                });
                actIndexes.push(actIndex);
            });

            const gap = actGaps[actIndex] ?? 0;

            if (gap > 0) builtColumns.push({kind: 'gap', width: gap});
        });

        return {
            columns: builtColumns,
            actIndexByScene: actIndexes,
        };
    }, [actGaps, acts]);

    /* Memoize actions per scene to avoid re-renders. */
    const actionsByScene = useMemo(() => {
        const result = new Map<string, BoardCharacterActions>();

        if (!characterActions) return result;

        columns.forEach(column => {
            if (column.kind === 'scene') result.set(column.scene.headingBlockId, characterActions(column.scene.headingBlockId));
        });

        return result;
    }, [characterActions, columns]);

    const {
        focus,
        highlightRowIndex,
        highlightColumnIndex,
        highlightActIndex,
        cellStopProps,
        tableProps,
    } = useMatrixNavigation({
        rowCount: rows.length,
        columnCount: sceneColumnCount,
        actIndexByScene,
    });

    const trackOpenButton = (id: string) => (element: HTMLElement | null) => {
        if (element) {
            openButtons.current.set(id, element);
        } else {
            openButtons.current.delete(id);
        }
    };

    const handleOpenChange = (id: string, open: boolean) => {
        if (open) {
            setOpenCellId(id);

            return;
        }

        pendingRestoreRef.current = id;
        setOpenCellId(null);
    };

    useEffect(() => {
        const id = pendingRestoreRef.current;

        if (openCellId !== null || id === null) return;

        pendingRestoreRef.current = null;

        /* A frame late: after the popover unmounted, and only when nothing else took the focus. */
        rAFRef.current = requestAnimationFrame(() => {
            if (document.activeElement === document.body) openButtons.current.get(id)?.focus();
        });

        return () => {
            if (rAFRef.current !== null) {
                cancelAnimationFrame(rAFRef.current);
                rAFRef.current = null;
            }
        };
    }, [openCellId]);

    if (rows.length === 0) {
        return <Text as="p" variant="muted" size="sm">No characters yet.</Text>;
    }

    /* What every cell carries, wherever the focus stop happens to sit: on the td or its button. */
    const cellName = (
        row: BoardMatrixRow,
        column: BoardMatrixSceneColumn,
        cell: BoardMatrixCell,
    ) => {
        const unconfirmedSuffix = row.characterId === null ? ', not confirmed' : '';

        return `${row.name}, ${column.title}: ${CELL_STATE[cell.kind](cell)}${unconfirmedSuffix}`;
    };

    /* The tooltip gives the cell's state and names the scene (with the script's own numbering), never the character. */
    const cellTooltip = (cell: BoardMatrixCell, column: BoardMatrixSceneColumn) => {
        const number = formatSceneNumber(column.number, sceneNumberFormat);
        const sceneLine = `Scene: ${number === '' ? '' : `${number} `}${column.title}`;

        return (
            <>
                <span className={styles.tooltipLine}>{CELL_STATE[cell.kind](cell)}</span>
                <span className={styles.tooltipLine}>{sceneLine}</span>
            </>
        );
    };

    const renderRowCells = (row: BoardMatrixRow, rowIndex: number): ReactNode[] => columns.flatMap((column, columnIndex) => {
        if (column.kind === 'gap') {
            return [<td key={`gap-${columnIndex}`} aria-hidden="true" />];
        }

        const cell = row.cells[column.sceneIndex];

        if (!cell) return [];

        const isFocusStop = rowIndex === focus[0] && column.sceneIndex === focus[1];
        const headingBlockId = column.scene.headingBlockId;
        const id = `${row.id}::${headingBlockId}`;
        const isInteractive = cell.chip
            ? characterActions !== undefined
            : onAdd !== undefined && row.characterId !== null;

        const cellOnAdd = isInteractive && !cell.chip && onAdd && row.characterId
            ? (target: BoardMatrixSceneColumn) => {
                onAdd(row.characterId as string, target);
                setOpenCellId(id);
            }
            : undefined;

        return [
            <MatrixCell
                key={headingBlockId}
                cell={cell}
                row={row}
                column={column}
                isFocusStop={isFocusStop}
                cellName={cellName(row, column.scene, cell)}
                cellTooltip={cellTooltip(cell, column.scene)}
                cellStopProps={cellStopProps(rowIndex, column.sceneIndex)}
                characterActions={isInteractive && cell.chip ? actionsByScene.get(headingBlockId) : undefined}
                isOpen={openCellId === id}
                onOpenChange={open => handleOpenChange(id, open)}
                onAdd={cellOnAdd}
                trackOpenButton={trackOpenButton}
            />,
        ];
    });

    return (
        <div className={styles.container}>
            <table
                ref={gridRef}
                className={styles.grid}
                role="grid"
                aria-label="Characters by scene"
                {...tableProps}
            >
                <MatrixHeader
                    acts={acts}
                    actGaps={actGaps}
                    columns={columns}
                    highlightActIndex={highlightActIndex}
                    highlightColumnIndex={highlightColumnIndex}
                />
                <tbody>
                    {rows.map((row, rowIndex) => {
                        const isUnconfirmed = row.characterId === null;
                        const ariaLabel = `${row.name}, ${sceneCountText(row.sceneCount)}${isUnconfirmed ? ', not confirmed' : ''}`;

                        return (
                            <tr key={row.id}>
                                <th
                                    scope="row"
                                    className={styles.rowHeader}
                                    aria-label={ariaLabel}
                                >
                                    <span className={styles.rowColor}>
                                        <ColorDot color={row.color} />
                                    </span>
                                    <Text
                                        as="span"
                                        className={clsx(styles.rowName, rowIndex === highlightRowIndex && styles.highlight)}
                                        variant={isUnconfirmed ? 'muted' : undefined}
                                    >
                                        {row.name}
                                    </Text>
                                </th>
                                {renderRowCells(row, rowIndex)}
                                <td className={styles.countCell}>{sceneCountText(row.sceneCount)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
