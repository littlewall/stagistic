import {sceneLine} from './arcsLabels';
import type {BoardArcsArc, BoardArcsScene} from './arcsTypes';
import styles from './BoardArcs.module.css';
import {ColorDot} from './ColorDot';

/** Identity and location form the header; the event gets its own reading space. */
export const ArcsTooltipContent = ({
    arc,
    scene,
    note,
}: {
    arc: BoardArcsArc,
    scene?: BoardArcsScene,
    note?: string | null,
}) => (
    <>
        <div className={styles.tooltipHeader}>
            <div className={styles.tooltipCharacter}>
                <ColorDot color={arc.color} />
                <strong>{arc.name}</strong>
            </div>
            {scene ? <div className={styles.tooltipScene}>{sceneLine(scene)}</div> : null}
        </div>
        {note ? <p className={styles.tooltipNote}>{note}</p> : null}
    </>
);
