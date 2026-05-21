import {clampNumber} from '@stagistic/script';
import clsx from 'clsx';

import styles from './ProgressBar.module.css';

type ProgressBarProps = {
    value?: number,
    label?: string,
    size?: 'sm' | 'md',
};

const clampProgress = (value: number) => clampNumber(value, 0, 1);

export const ProgressBar = ({
    value,
    label,
    size = 'md',
}: ProgressBarProps) => {
    const hasValue = typeof value === 'number';
    const progressValue = hasValue ? clampProgress(value) : null;
    const percent = hasValue ? Math.round(progressValue! * 100) : null;
    const progressStyle = hasValue ? {width: `${percent}%`} : undefined;
    const ariaValue = hasValue ? Math.round(progressValue! * 100) : undefined;

    return (
        <div
            className={clsx(styles.bar, size === 'sm' && styles.small)}
            role="progressbar"
            aria-valuenow={ariaValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
        >
            <div className={clsx(styles.track, !hasValue && styles.indeterminate)}>
                <div
                    className={clsx(styles.fill, !hasValue && styles.indeterminate)}
                    style={progressStyle}
                />
            </div>
            {hasValue ? <div className={styles.percent}>{percent}%</div> : null}
        </div>
    );
};
