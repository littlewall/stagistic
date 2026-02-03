import type {ReactNode} from 'react';

import {ProgressPanel} from './feedback/ProgressPanel';
import styles from './LoaderOverlay.module.css';

type LoaderOverlayProps = {
    title?: string,
    subtitle?: string,
    progress?: number,
    statusText?: string,
    hint?: ReactNode,
};

export function LoaderOverlay({
    title = 'Preparing Stagistic',
    subtitle = 'Setting up your workspace',
    progress,
    statusText,
    hint,
}: LoaderOverlayProps) {
    return (
        <div className={styles.overlay} role="status" aria-live="polite">
            <div className={styles.panel}>
                <ProgressPanel
                    title={title}
                    subtitle={subtitle}
                    progress={progress}
                    statusText={statusText}
                    hint={hint}
                />
            </div>
        </div>
    );
}
