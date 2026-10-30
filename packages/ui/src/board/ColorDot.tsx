import clsx from 'clsx';
import type {CSSProperties} from 'react';

import styles from './ColorDot.module.css';

export interface ColorDotProps {
    /** Character color; null draws the neutral dot of an unassigned color. */
    color: string | null,
}

/** A character's color as a small dot. Decorative: the name always sits beside it. */
export const ColorDot = ({color}: ColorDotProps) => (
    <span
        aria-hidden="true"
        className={clsx(styles.dot, color === null && styles.neutral)}
        style={color === null ? undefined : {'--dot-color': color} as CSSProperties}
    />
);

export interface ColorDotStackProps {
    colors: ReadonlyArray<string | null>,
}

/** Overlapping dots, first on top of the row's start edge. */
export const ColorDotStack = ({colors}: ColorDotStackProps) => (
    <span className={styles.stack} aria-hidden="true">
        {colors.map((color, index) => <ColorDot key={`${index}-${color}`} color={color} />)}
    </span>
);
