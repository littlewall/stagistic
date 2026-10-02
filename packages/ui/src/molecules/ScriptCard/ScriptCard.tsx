import type {ScriptSummaryMetadata} from '@stagistic/script';
import clsx from 'clsx';
import {type ReactNode, useId} from 'react';
import {Button as AriaButton} from 'react-aria-components';

import {Button} from '../../atoms/Button/Button';
import styles from './ScriptCard.module.css';

export interface ScriptCardProps {
    title: string,
    subtitle?: string | null,
    summaryMetadata?: ScriptSummaryMetadata | null,
    lastEdited: string,
    actions?: ReactNode,
    onOpen: () => void,
    className?: string,
}

const ROMAN_NUMERALS = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
] as const;

const romanNumeral = (value: number) => {
    let remaining = value;
    let label = '';

    for (const [amount, numeral] of ROMAN_NUMERALS) {
        label += numeral.repeat(Math.floor(remaining / amount));
        remaining %= amount;
    }

    return label;
};

const sceneLabel = (count: number | null) => `${count ?? '—'} ${count === 1 ? 'scene' : 'scenes'}`;

const ScriptStructure = ({metadata}: {metadata?: ScriptSummaryMetadata | null}) => {
    if (!metadata?.actSceneCounts.length) {
        return (
            <div className={styles.noActs}>
                <span className={styles.sceneTotal}>{sceneLabel(metadata?.sceneCount ?? null)}</span>
                <span className={styles.bar} aria-hidden="true" />
            </div>
        );
    }

    const segments = metadata.actSceneCounts.map((count, index) => ({
        label: `Act ${romanNumeral(index + 1)}`,
        count,
    }));

    if (metadata.unassignedSceneCount > 0) {
        segments.unshift({label: 'Before Act I', count: metadata.unassignedSceneCount});
    }

    return (
        <div className={styles.distribution}>
            {segments.map(segment => (
                <div
                    key={segment.label}
                    className={styles.segment}
                    style={{flexGrow: Math.max(segment.count, 1)}}
                >
                    <span className={styles.actLabel}>{segment.label} · {sceneLabel(segment.count)}</span>
                    <span
                        className={clsx(styles.bar, segment.count === 0 && styles.emptyBar)}
                        aria-hidden="true"
                    />
                </div>
            ))}
        </div>
    );
};

export const ScriptCard = ({
    title,
    subtitle,
    summaryMetadata,
    lastEdited,
    actions,
    onOpen,
    className,
}: ScriptCardProps) => {
    const titleId = useId();

    return (
        <article className={clsx(styles.card, className)} aria-labelledby={titleId}>
            <header className={styles.header}>
                <div className={styles.copy}>
                    <h2 id={titleId} className={styles.title}>
                        <AriaButton className={styles.open} onPress={onOpen}>{title}</AriaButton>
                    </h2>
                    {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
                </div>
                <div className={styles.headerActions}>
                    {actions ? <div className={styles.actions}>{actions}</div> : null}
                </div>
            </header>
            <div className={styles.structure} aria-label="Script structure">
                <ScriptStructure metadata={summaryMetadata} />
            </div>
            <footer className={styles.footer}>
                <Button
                    variant="outline"
                    size="xs"
                    className={styles.editorButton}
                    aria-label={`Go to editor: ${title}`}
                    onPress={onOpen}
                >
                    Go to editor
                </Button>
                <span className={styles.lastEdited}>{lastEdited}</span>
            </footer>
        </article>
    );
};

export const ScriptCardGrid = ({children}: {children: ReactNode}) => (
    <div className={styles.grid}>{children}</div>
);
