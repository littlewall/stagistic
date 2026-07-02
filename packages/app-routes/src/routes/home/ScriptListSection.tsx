import type {ScriptSummary} from '@stagistic/app-core';
import {
    ScriptActionsMenu,
    ScriptIcon,
    SubtleText,
} from '@stagistic/ui';
import type {ReactNode} from 'react';

import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './HomeRoute.module.css';

interface ScriptListSectionProps {
    title: string,
    scripts: ScriptSummary[],
    action?: ReactNode,
    onOpenScript: (scriptId: string) => void,
}

export const ScriptListSection = ({
    title,
    scripts,
    action,
    onOpenScript,
}: ScriptListSectionProps) => {
    if (scripts.length === 0) {
        return null;
    }

    return (
        <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                {action ? <div className={styles.sectionAction}>{action}</div> : null}
            </div>
            <div className={styles.scriptList}>
                {scripts.map(script => (
                    <div key={script.id} className={styles.scriptRow}>
                        <button
                            type="button"
                            className={styles.scriptOpenButton}
                            onClick={() => onOpenScript(script.id)}
                        >
                            <ScriptIcon className={styles.scriptIcon} aria-hidden="true" />
                            <span className={styles.scriptInfo}>
                                <span className={styles.scriptTitle}>{script.title}</span>
                                {script.subtitle ? (
                                    <span className={styles.scriptSubtitle}>{script.subtitle}</span>
                                ) : null}
                            </span>
                            <SubtleText className={styles.scriptMeta}>
                                {formatLastEdited(script.updatedAt)}
                            </SubtleText>
                        </button>
                        <div className={styles.actionsMenu}>
                            <ScriptActionsMenu scriptTitle={script.title} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
