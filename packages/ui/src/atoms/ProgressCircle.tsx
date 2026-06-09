import {ProgressBar} from 'react-aria-components';

import styles from './ProgressCircle.module.css';

type ProgressCircleProps = {
    'aria-label': string,
    isIndeterminate?: boolean,
};

export const ProgressCircle = ({
    'aria-label': ariaLabel,
    isIndeterminate = false,
}: ProgressCircleProps) => (
    <ProgressBar
        aria-label={ariaLabel}
        isIndeterminate={isIndeterminate}
        className={styles.circle}
    >
        <span className={styles.spinner} aria-hidden />
    </ProgressBar>
);
