import {DELETE_SCRIPT_CONFIRM_PHRASE, PanelHeader, SettingsGroup, TypeToConfirmAction} from '@stagistic/ui';
import {useToastController} from '@stagistic/ui';
import {useCallback, useState} from 'react';

import type {DangerZoneHandlers} from '../types';

import panelStyles from '../ScriptEditorSettingsPanel.module.css';
import styles from './DangerZoneSettingsPanel.module.css';

type DangerZoneSettingsPanelProps = DangerZoneHandlers;

export const DangerZoneSettingsPanel = ({scriptTitle, onDeleteScript}: DangerZoneSettingsPanelProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const {addToast} = useToastController();

    const handleDelete = useCallback(async () => {
        setIsDeleting(true);

        try {
            await onDeleteScript();
            addToast({
                title: 'Script deleted',
                description: scriptTitle ? `"${scriptTitle}" has been permanently deleted.` : 'The script has been permanently deleted.',
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to delete script');
            addToast({
                title: 'Failed to delete script',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
                variant: 'error',
            });
            setIsDeleting(false);
        }
    }, [onDeleteScript, addToast, scriptTitle]);

    return (
        <SettingsGroup gap="2xl" className={panelStyles.panelTokens}>
            <PanelHeader level={3} title="Danger zone" />
            <section className={styles.dangerCard}>
                <PanelHeader
                    level={4}
                    className={styles.dangerHeader}
                    title="Delete script"
                    description={
                        <>
                            Permanently deletes
                            {scriptTitle ? <strong>{` “${scriptTitle}” `}</strong> : ' this script '}
                            and all of its content. This action cannot be undone.
                        </>
                    }
                />
                <TypeToConfirmAction
                    phrase={DELETE_SCRIPT_CONFIRM_PHRASE}
                    confirmLabel="Delete script"
                    inputAriaLabel={scriptTitle ? `Type ${DELETE_SCRIPT_CONFIRM_PHRASE} to delete ${scriptTitle}` : undefined}
                    isPending={isDeleting}
                    onConfirm={handleDelete}
                />
            </section>
        </SettingsGroup>
    );
};
