import type {ReactNode} from 'react';

import {ProgressPanel} from './feedback/ProgressPanel';

import styles from './LoaderOverlay.module.css';

type LoaderOverlayProps = {
    label?: string;
    messages?: ReactNode[];
    progress?: number;
    variant?: 'solid' | 'scrim';
};

export const LoaderOverlay = ({label = 'Preparing Stagistic', messages = ['Setting up your workspace'], progress, variant = 'solid'}: LoaderOverlayProps) => {
    return (
        <div className={`${styles.overlay} ${variant === 'scrim' ? styles.scrim : ''}`} role="status" aria-live="polite">
            <div className={styles.panel}>
                <ProgressPanel label={label} messages={messages} progress={progress} />
            </div>
        </div>
    );
};
