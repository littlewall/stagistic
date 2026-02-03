import clsx from 'clsx';
import type {ReactNode} from 'react';

import {ProgressBar} from './ProgressBar';
import styles from './ProgressPanel.module.css';

type ProgressPanelProps = {
    title: string,
    subtitle?: string,
    progress?: number,
    statusText?: string,
    hint?: ReactNode,
    size?: 'sm' | 'md',
};

export const ProgressPanel = ({
    title,
    subtitle,
    progress,
    statusText,
    hint,
    size = 'md',
}: ProgressPanelProps) => {
    return (
        <div className={clsx(styles.panel, size === 'sm' && styles.panelSmall)}>
            <div>
                <div className={styles.title}>{title}</div>
                {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
            </div>
            <ProgressBar value={progress} label={title} size={size} />
            {statusText ? <div className={styles.status}>{statusText}</div> : null}
            {hint ? <div className={styles.hint}>{hint}</div> : null}
        </div>
    );
};
