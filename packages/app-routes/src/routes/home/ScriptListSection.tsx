import type {ScriptSummary} from '@stagistic/app-core';
import {
    ScriptActionsMenu,
    ScriptCard,
    ScriptCardGrid,
} from '@stagistic/ui';

import {formatLastEdited} from '../../shared/formatLastEdited';
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
            <ScriptCardGrid>
                {scripts.map(script => (
                    <ScriptCard
                        key={script.id}
                        title={script.title}
                        subtitle={script.subtitle}
                        summaryMetadata={script.summaryMetadata}
                        lastEdited={formatLastEdited(script.updatedAt)}
                        onOpen={() => onOpenScript(script.id)}
                        actions={(
                            <ScriptActionsMenu
                                scriptTitle={script.title}
                                onRename={() => onRenameScript(script)}
                                onDuplicate={() => onDuplicateScript(script)}
                                onDelete={() => onDeleteScript(script)}
                            />
                        )}
                    />
                ))}
            </ScriptCardGrid>
        </section>
    );
};
