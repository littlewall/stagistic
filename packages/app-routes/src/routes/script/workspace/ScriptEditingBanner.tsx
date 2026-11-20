import type {ScriptEditingSession, ScriptEditingState} from '@stagistic/app-core';
import {
    Button,
    ModalDialog,
    ModalHeader,
} from '@stagistic/ui';

import {TextRescue} from '../../../bootstrap/DatabaseHandoverOverlay';
import styles from './ScriptEditingBanner.module.css';

const keepOpen = () => {};

export const describeReadOnlyReason = (reason: ScriptEditingState['reason']) => (reason === 'refused' || reason === 'lost'
    ? 'This script changed in another tab since you opened it.'
    : 'This script is open for editing in another tab.');

/**
 * Calm notice while another tab edits this script, with the ways on: load what
 * it saved, or edit here. Text this tab could not save is offered for copying.
 */
export const ScriptEditingBanner = ({
    session,
    state,
    hasNewChanges,
}: {
    session: ScriptEditingSession,
    state: ScriptEditingState,
    hasNewChanges: boolean,
}) => (
    <>
        {state.role === 'read-only' ? (
            <div className={styles.banner} role="status">
                <span>{describeReadOnlyReason(state.reason)}</span>
                {hasNewChanges ? <Button variant="secondary" onPress={session.reload}>Load new changes</Button> : null}
                <Button isDisabled={state.isTakingOver} onPress={() => void session.takeOver()}>Edit here</Button>
            </div>
        ) : null}
        {state.rescueText ? (
            <ModalDialog
                ariaLabel="Your latest changes were not saved"
                isOpen
                onClose={keepOpen}
            >
                <ModalHeader
                    title="Your latest changes were not saved"
                    description="This script changed in another tab, so this tab could not save. Copy your text before you continue: it exists only here."
                />
                <TextRescue text={state.rescueText} onReload={session.dismissRescue} reloadLabel="Done" />
            </ModalDialog>
        ) : null}
    </>
);
