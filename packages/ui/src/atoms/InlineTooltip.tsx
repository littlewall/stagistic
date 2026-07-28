import type {ReactNode} from 'react';

import styles from './InlineTooltip.module.css';
import {Tooltip} from './Tooltip';

export const InlineTooltip = ({
    className,
    testId,
    label,
    tooltip,
}: {
    className?: string,
    testId?: string,
    label: ReactNode,
    tooltip: ReactNode,
}) => (
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
