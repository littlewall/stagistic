import type {CSSProperties, ReactNode} from 'react';

import styles from './BoardLayout.module.css';

export interface BoardLayoutProps {
    /** Controls above the canvas; omitted while there is nothing to control. */
    toolbar?: ReactNode,
    /** Custom properties for the whole Board, e.g. the script's scene casing. */
    style?: CSSProperties,
    children: ReactNode,
}

/** Page frame of the Board: a hairline-separated toolbar over a scrolling canvas. */
export const BoardLayout = ({
    toolbar,
    style,
    children,
}: BoardLayoutProps) => (
    <div className={styles.layout} style={style}>
        {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
        <div className={styles.canvas}>{children}</div>
    </div>
);
