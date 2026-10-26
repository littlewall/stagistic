import clsx from 'clsx';
import {useEffect, useState} from 'react';

import {Button} from '../../atoms/Button/Button';
import styles from './CodeSnippet.module.css';

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_LABEL: Record<CopyState, string> = {
    idle: 'Copy',
    copied: 'Copied',
    failed: 'Copy failed',
};

const RESET_DELAY_MS = 2000;

type CodeSnippetProps = {
    code: string,
    /** Accessible name of the copy button, e.g. `Copy configuration`. */
    copyLabel?: string,
    className?: string,
};

/**
 * Read-only technical text (a path, a config block) with a copy action. The
 * text stays selectable, so a failed clipboard write still leaves a way out.
 */
export const CodeSnippet = ({
    code,
    copyLabel = 'Copy',
    className,
}: CodeSnippetProps) => {
    const [copyState, setCopyState] = useState<CopyState>('idle');

    useEffect(() => {
        if (copyState === 'idle') {
            return;
        }

        const timeout = window.setTimeout(() => setCopyState('idle'), RESET_DELAY_MS);

        return () => window.clearTimeout(timeout);
    }, [copyState]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopyState('copied');
        } catch {
            setCopyState('failed');
        }
    };

    return (
        <div className={clsx(styles.root, className)}>
            <pre className={styles.code}>
                <code>{code}</code>
            </pre>
            <Button
                variant="outline"
                size="sm"
                aria-label={copyState === 'idle' ? copyLabel : COPY_LABEL[copyState]}
                onPress={() => void copy()}
            >
                {COPY_LABEL[copyState]}
            </Button>
        </div>
    );
};
