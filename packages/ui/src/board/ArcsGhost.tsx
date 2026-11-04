import {POINT_RADIUS} from './arcsGeometry';
import type {BoardArcsArc} from './arcsTypes';
import styles from './BoardArcs.module.css';

const GHOST_OPACITY = 0.5;
const GHOST_LABEL_OFFSET = 10;

/** The point a click would add: the active character's color and name at the cursor. */
export const ArcsGhost = ({
    arc,
    x,
    y,
}: {
    arc: BoardArcsArc,
    x: number,
    y: number,
}) => (
    <g className={styles.ghost} data-ghost={arc.id} pointerEvents="none">
        <circle cx={x} cy={y} r={POINT_RADIUS} fill={arc.color} opacity={GHOST_OPACITY} />
        <text x={x + GHOST_LABEL_OFFSET} y={y} className={styles.ghostLabel}>{arc.name}</text>
    </g>
);
