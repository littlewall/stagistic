import type {ScriptSummary} from '@stagistic/app-core';
import {
    ScriptActionsMenu,
    ScriptIcon,
    Text,
} from '@stagistic/ui';

import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './HomeRoute.module.css';

interface ScriptListSectionProps {
    scripts: ScriptSummary[],
    onOpenScript: (scriptId: string) => void,
    onDeleteScript: (script: ScriptSummary) => void,
    onRenameScript: (script: ScriptSummary) => void,
    onDuplicateScript: (script: ScriptSummary) => void,
}

export const ScriptListSection = ({
    scripts,
    onOpenScript,
    onDeleteScript,
    onRenameScript,
    onDuplicateScript,
}: ScriptListSectionProps) => {
    if (scripts.length === 0) {
        return null;
    }

    return (
        <section className={styles.listSection} aria-label="Scripts">
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
                            <Text variant="muted" className={styles.scriptMeta}>
                                {formatLastEdited(script.updatedAt)}
                            </Text>
                        </button>
                        <div className={styles.actionsMenu}>
                            <ScriptActionsMenu
                                scriptTitle={script.title}
                                onRename={() => onRenameScript(script)}
                                onDuplicate={() => onDuplicateScript(script)}
                                onDelete={() => onDeleteScript(script)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
