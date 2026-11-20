import {forwardRef} from 'react';

import type {BoardArcsArc} from './arcsTypes';
import styles from './BoardArcs.module.css';
import {ColorDot} from './ColorDot';

/** Independent visibility checkboxes; hidden characters remain available to turn back on. */
export const ArcsLegend = forwardRef<HTMLUListElement, {
    arcs: readonly BoardArcsArc[],
    hiddenIds: ReadonlySet<string>,
    onToggle: (id: string) => void,
}>(({
    arcs,
    hiddenIds,
    onToggle,
}, ref) => (
    <ul ref={ref} className={styles.legend} aria-label="Characters">
        {arcs.map(arc => (
            <li key={arc.id}>
                <button
                    type="button"
                    className={styles.legendButton}
                    data-arc-id={arc.id}
                    role="checkbox"
                    aria-checked={!hiddenIds.has(arc.id)}
                    onClick={() => onToggle(arc.id)}
                >
                    <ColorDot color={arc.color} isFilled={!hiddenIds.has(arc.id)} />
                    <span>{arc.name}</span>
                </button>
            </li>
        ))}
    </ul>
));

ArcsLegend.displayName = 'ArcsLegend';
