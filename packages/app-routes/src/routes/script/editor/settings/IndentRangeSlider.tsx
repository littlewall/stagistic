import {clsx} from '@stagistic/ui';
import type {
    ChangeEvent,
    CSSProperties,
    ReactNode,
} from 'react';

import styles from './IndentRangeSlider.module.css';

export interface IndentRangeHandle {
    value: number,
    min: number,
    max: number,
    step: number,
    ariaLabel: string,
    onChange: (event: ChangeEvent<HTMLInputElement>) => void,
    /** Commit the dragged value; the handles are local until the pointer is released. */
    onCommit: () => void,
}

interface IndentRangeSliderProps {
    /** The `--preview-*` percentages that place the rail, the selection and the ticks. */
    style?: CSSProperties,
    start: IndentRangeHandle,
    end: IndentRangeHandle,
    /** Three spans: the left measure, the centred content measure, the right measure. */
    labels: ReactNode,
}

const handleProps = (handle: IndentRangeHandle) => ({
    type: 'range' as const,
    min: handle.min,
    max: handle.max,
    step: handle.step,
    value: handle.value,
    onChange: handle.onChange,
    onPointerUp: handle.onCommit,
    'aria-label': handle.ariaLabel,
});

export const IndentRangeSlider = ({
    style,
    start,
    end,
    labels,
}: IndentRangeSliderProps) => (
    <>
        <div className={styles.track} style={style}>
            <span className={styles.base} />
            <span className={styles.middleBase} />
            <span className={styles.selected} />
            <span className={styles.defaultStart} />
            <span className={styles.defaultEnd} />
            <input className={clsx(styles.input, styles.inputStart)} {...handleProps(start)} />
            <input className={clsx(styles.input, styles.inputEnd)} {...handleProps(end)} />
        </div>
        <div className={styles.labels}>{labels}</div>
    </>
);
