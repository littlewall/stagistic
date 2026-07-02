import {DeleteScriptConfirm} from '@stagistic/ui';
import {useToastController} from '@stagistic/ui';
import {
    useCallback,
    useState,
} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import type {DangerZoneHandlers} from '../types';
import styles from './DangerZoneSettingsPanel.module.css';

type DangerZoneSettingsPanelProps = DangerZoneHandlers;

export const DangerZoneSettingsPanel = ({
    scriptTitle,
    onDeleteScript,
}: DangerZoneSettingsPanelProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const {addToast} = useToastController();

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);

        try {
            await onDeleteScript();
            addToast({
                title: 'Script deleted',
                description: scriptTitle
                    ? `"${scriptTitle}" has been permanently deleted.`
                    : 'The script has been permanently deleted.',
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to delete script', error);
            addToast({
                title: 'Failed to delete script',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'error',
            });
            setIsDeleting(false);
        }
    }, [
        onDeleteScript,
        addToast,
        scriptTitle,
    ]);

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Danger zone</h3>
            <section className={styles.dangerCard}>
                <div className={styles.dangerHeader}>
                    <h4 className={styles.dangerTitle}>Delete script</h4>
                    <p className={styles.dangerDescription}>
                        Permanently deletes
                        {scriptTitle ? <strong>{` “${scriptTitle}” `}</strong> : ' this script '}
                        and all of its content. This action cannot be undone.
                    </p>
                </div>
                <DeleteScriptConfirm
                    scriptTitle={scriptTitle}
                    isDeleting={isDeleting}
                    onConfirm={handleDelete}
                />
            </section>
        </div>
    );
};
