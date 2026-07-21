import clsx from 'clsx';
import type {ReactNode} from 'react';

import {ProgressBar} from './ProgressBar';
import styles from './ProgressPanel.module.css';

type ProgressPanelProps = {
    label: string,
    messages: ReactNode[],
    progress?: number,
    size?: 'sm' | 'md',
};

export const ProgressPanel = ({
    label,
    messages,
    progress,
    size = 'md',
}: ProgressPanelProps) => {
    return (
        <div className={clsx(styles.panel, size === 'sm' && styles.small)}>
            <ProgressBar
                value={progress}
                label={label}
                size={size}
            />
            {messages.length > 0 ? (
                <div className={styles.copy}>
                    {messages.map((message, index) => (
                        <div className={styles.message} key={index}>{message}</div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};
