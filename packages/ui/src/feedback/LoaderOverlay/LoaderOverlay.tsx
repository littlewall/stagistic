import type {ReactNode} from 'react';

import {ProgressPanel} from '../ProgressPanel/ProgressPanel';
import styles from './LoaderOverlay.module.css';

type LoaderOverlayProps = {
    label?: string,
    messages?: ReactNode[],
    progress?: number,
    /** `notice`: a strongly tinted scrim with a visible title and larger, narrower copy, for short moments the writer must read quickly. */
    variant?: 'solid' | 'scrim' | 'notice',
};

export const LoaderOverlay = ({
    label = 'Preparing Stagistic',
    messages = ['Setting up your workspace'],
    progress,
    variant = 'solid',
}: LoaderOverlayProps) => {
    return (
        <div
            className={`${styles.overlay} ${variant === 'scrim' ? styles.scrim : ''} ${variant === 'notice' ? styles.notice : ''}`}
            role="status"
            aria-live="polite"
        >
            <div className={styles.panel}>
                {variant === 'notice' ? <p className={styles.title}>{label}</p> : null}
                <ProgressPanel
                    label={label}
                    messages={messages}
                    progress={progress}
                />
            </div>
        </div>
    );
};
