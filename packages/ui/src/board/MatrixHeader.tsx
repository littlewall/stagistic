import clsx from 'clsx';

import {Tooltip} from '../atoms/Tooltip/Tooltip';
import {Text} from '../primitives/Text/Text';
import type {BoardMatrixAct, MatrixColumn} from './BoardMatrix';
import styles from './BoardMatrix.module.css';

interface MatrixHeaderProps {
    acts: readonly BoardMatrixAct[],
    /** The measured extra width each act's name needs beyond its scene columns. */
    actGaps: readonly number[],
    columns: readonly MatrixColumn[],
    highlightActIndex: number,
    highlightColumnIndex: number,
}

/**
 * The pinned head of the matrix: the act band above the scene numbers. The corner cell
 * rides both sticks; the trailing cell closes the scene-count column. A gap column
 * carries an act name's extra width after the act's last scene.
 */
export const MatrixHeader = ({
    acts,
    actGaps,
    columns,
    highlightActIndex,
    highlightColumnIndex,
}: MatrixHeaderProps) => (
    <thead>
        <tr>
            <th aria-hidden="true" className={clsx(styles.corner, styles.actHeader)} />
            {acts.map((act, index) => {
                const gap = actGaps[index] ?? 0;

                return (
                    <th
                        key={act.key}
                        scope="col"
                        colSpan={act.scenes.length + (gap > 0 ? 1 : 0)}
                        data-act={act.name}
                        className={clsx(styles.actHeader, index > 0 && styles.actStart)}
                    >
                        {/* The name rides above the columns; a measured gap after the act's last
                         * scene column makes room for it without widening the dots. */}
                        <span className={clsx(styles.actName, index === highlightActIndex && styles.highlight)}>
                            <Text as="span" variant="eyebrow" size="xs">{act.name}</Text>
                        </span>
                    </th>
                );
            })}
            <th aria-hidden="true" className={styles.actHeader} />
        </tr>
        <tr>
            <th aria-hidden="true" className={clsx(styles.corner, styles.sceneHeader)} />
            {columns.map((column, columnIndex) => column.kind === 'gap' ? (
                <th
                    key={`gap-${columnIndex}`}
                    aria-hidden="true"
                    className={styles.sceneHeader}
                    style={{width: `${column.width}px`}}
                />
            ) : (
                <th
                    key={column.scene.headingBlockId}
                    scope="col"
                    aria-label={`Scene ${column.scene.number}: ${column.scene.title}`}
                    data-scene-number={column.scene.number}
                    className={clsx(styles.sceneHeader, column.isActStart && styles.actStart)}
                >
                    <Tooltip
                        label={column.scene.page !== null ? `${column.scene.title}, p. ${column.scene.page}` : column.scene.title}
                        placement="bottom"
                    >
                        <span
                            className={clsx(styles.sceneNumber, column.sceneIndex === highlightColumnIndex && styles.highlight)}
                            role="img"
                            tabIndex={-1}
                        >
                            {column.scene.number}
                        </span>
                    </Tooltip>
                </th>
            ))}
            <th aria-hidden="true" className={styles.sceneHeader} />
        </tr>
    </thead>
);
