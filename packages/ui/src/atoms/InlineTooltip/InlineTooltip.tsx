import type {ReactNode} from 'react';

import {Tooltip} from '../Tooltip/Tooltip';

import styles from './InlineTooltip.module.css';

export const InlineTooltip = ({className, testId, label, tooltip}: {className?: string; testId?: string; label: ReactNode; tooltip: ReactNode}) => (
    <Tooltip label={tooltip}>
        <button
            type="button"
            className={`${styles.trigger} ${className ?? ''}`}
            data-testid={testId}
        >
            {label}
        </button>
    </Tooltip>
);
