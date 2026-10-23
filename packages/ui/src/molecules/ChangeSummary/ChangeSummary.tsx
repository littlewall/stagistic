import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './ChangeSummary.module.css';

/** `in`: arrives or carries over · `kept`: stays as it is · `out`: is removed or lost. */
export type ChangeTone = 'in' | 'kept' | 'out';

export interface ChangeSummaryItem {
    tone: ChangeTone,
    /** Short past participle, e.g. “Restored”, “Kept”, “Removed”. */
    label: string,
    text: ReactNode,
}

export interface ChangeSummaryProps {
    items: readonly ChangeSummaryItem[],
    className?: string,
}

const TONE_CLASS: Record<ChangeTone, string | undefined> = {
    in: styles.in,
    kept: styles.kept,
    out: styles.out,
};

/**
 * What a confirmed action changes, one line per outcome. Only the labels carry
 * colour, so the sentences stay calm and the outcomes can be scanned.
 */
export const ChangeSummary = ({items, className}: ChangeSummaryProps) => (
    <ul className={clsx(styles.list, className)}>
        {items.map(item => (
            <li key={`${item.tone}:${item.label}`} className={styles.item}>
                <span className={clsx(styles.tag, TONE_CLASS[item.tone])}>{item.label}</span>
                <span className={styles.text}>{item.text}</span>
            </li>
        ))}
    </ul>
);
