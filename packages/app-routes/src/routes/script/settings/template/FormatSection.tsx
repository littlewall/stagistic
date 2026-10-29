import {
    ButtonDropdownMenu,
    LockIcon,
    PanelHeader,
    SettingsGroup,
} from '@stagistic/ui';
import clsx from 'clsx';
import type {ReactNode} from 'react';

import styles from './formatTemplate.module.css';
import {useFormatTemplate} from './FormatTemplateContext';

const EDIT_FORMAT_ITEMS = [
    {id: 'unlock', label: 'Unlock to edit'},
    {id: 'change', label: 'Use different template…'},
    {
        id: 'reset',
        label: 'Reset to Stagistic Default…',
        dividerBefore: true,
    },
];

/**
 * The template-controlled part of a settings panel. Unlocked, it is a plain
 * section; locked, it becomes a framed, read-only area whose header names the
 * template and offers one "Edit format" menu. `partial` frames nothing: only
 * some controls follow the template, so just the header bar is shown.
 */
export const FormatSection = ({
    heading,
    partial = false,
    variant = 'framed',
    children,
}: {
    /** Section title; omit when the panel itself is the format (Page format). */
    heading?: string,
    partial?: boolean,
    /** A quiet metadata row for narrow export panels. */
    variant?: 'framed' | 'inline',
    children?: ReactNode,
}) => {
    const {
        template,
        change,
        resetToDefault,
        unlock,
    } = useFormatTemplate();

    if (!template) {
        if (!heading && !children) return null;

        return (
            <SettingsGroup gap="lg">
                {heading ? <PanelHeader level={4} size="section" title={heading} /> : null}
                {children ? <fieldset className={styles.formatFields}>{children}</fieldset> : null}
            </SettingsGroup>
        );
    }

    const actions: Record<string, () => void> = {
        unlock,
        change,
        reset: resetToDefault,
    };

    if (variant === 'inline') {
        return (
            <section className={styles.inlineSection} aria-label={`${heading ?? 'Format'}, set by ${template.label}`}>
                <div className={styles.inlineBar}>
                    <LockIcon className={styles.inlineIcon} aria-hidden="true" />
                    <span className={styles.inlineTitle} title={`Set by ${template.label}`}>{template.label}</span>
                    <ButtonDropdownMenu label="Edit" aria-label="Edit format" variant="ghost" size="xs" items={EDIT_FORMAT_ITEMS} onAction={id => actions[id]?.()} />
                </div>
                {children ? <fieldset disabled className={styles.formatFields}>{children}</fieldset> : null}
            </section>
        );
    }

    return (
        <section className={clsx(styles.lockedSection, partial && styles.partial)} aria-label={`${heading ?? 'Format'}, set by ${template.label}`}>
            <div className={styles.lockedBar}>
                <LockIcon className={styles.lockedIcon} aria-hidden="true" />
                <p className={styles.lockedTitle}>
                    <strong>{heading ?? 'Format'}</strong>
                    <span>{partial ? ` · partly set by ${template.label}` : ` · set by ${template.label}`}</span>
                </p>
                <ButtonDropdownMenu label="Edit format" items={EDIT_FORMAT_ITEMS} onAction={id => actions[id]?.()} />
            </div>
            {children ? <fieldset disabled className={clsx(styles.formatFields, styles.lockedBody)}>{children}</fieldset> : null}
        </section>
    );
};
