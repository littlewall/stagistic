import {Button, Input} from '@stagistic/ui';
import {useToastController} from '@stagistic/ui';
import {
    useCallback,
    useState,
} from 'react';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import type {DangerZoneHandlers} from '../types';
import styles from './DangerZoneSettingsPanel.module.css';

const CONFIRM_PHRASE = 'delete me';

type DangerZoneSettingsPanelProps = DangerZoneHandlers;

export const DangerZoneSettingsPanel = ({
    scriptTitle,
    onDeleteScript,
}: DangerZoneSettingsPanelProps) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const isUnlocked = confirmText.trim() === CONFIRM_PHRASE;
    const {addToast} = useToastController();

    const handleDelete = useCallback(async () => {
        if (!isUnlocked || isDeleting) {
            return;
        }

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
        isDeleting,
        isUnlocked,
        onDeleteScript,
        addToast,
        scriptTitle,
    ]);

    return (
        <div className={panelStyles.panelStack}>
            <h3 className={panelStyles.panelTitle}>Delete script</h3>
            <section className={styles.dangerCard}>
                <div className={styles.dangerHeader}>
                    <h4 className={styles.dangerTitle}>Delete script</h4>
                    <p className={styles.dangerDescription}>
                        Permanently deletes
                        {scriptTitle ? <strong>{` “${scriptTitle}” `}</strong> : ' this script '}
                        and all of its content. This action cannot be undone.
                    </p>
                </div>
                <label className={styles.confirmField} htmlFor="danger-zone-confirm">
                    <span className={styles.confirmLabel}>
                        Type <code className={styles.confirmPhrase}>{CONFIRM_PHRASE}</code> to confirm
                    </span>
                    <Input
                        id="danger-zone-confirm"
                        type="text"
                        className={styles.confirmInput}
                        value={confirmText}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={CONFIRM_PHRASE}
                        disabled={isDeleting}
                        onChange={event => setConfirmText(event.target.value)}
                    />
                </label>
                <Button
                    variant="danger"
                    className={styles.deleteButton}
                    isDisabled={!isUnlocked}
                    isLoading={isDeleting}
                    onPress={handleDelete}
                >
                    {isDeleting ? 'Deleting…' : 'Delete script'}
                </Button>
            </section>
        </div>
    );
};
