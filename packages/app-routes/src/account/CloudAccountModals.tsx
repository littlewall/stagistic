import type {CloudStatus} from '@stagistic/sync-engine';
import {
    AccountSettingsModal,
    CloudSyncModal,
    SignInModal,
} from '@stagistic/ui';
import {useState} from 'react';

import type {CloudAccountState} from './CloudAccountProvider';
import {cloudSyncLabel} from './cloudSyncLabels';
import {TurnstileField} from './TurnstileField';

export const CloudAccountModals = ({
    state,
    status,
    turnstileSiteKey,
}: {
    state: CloudAccountState,
    status: CloudStatus | null,
    turnstileSiteKey: string,
}) => {
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const close = () => state.setModal(null);

    return (
        <>
            <SignInModal
                isOpen={state.modal === 'sign-in'}
                onClose={close}
                onRequestLink={email => state.requestLink(email, captchaToken ?? '')}
                isCaptchaComplete={captchaToken !== null}
                onPasskeySignIn={state.signInWithPasskey}
                captcha={state.modal === 'sign-in' ? (
                    <TurnstileField
                        siteKey={turnstileSiteKey}
                        onToken={setCaptchaToken}
                    />
                ) : null}
            />
            <AccountSettingsModal
                isOpen={state.modal === 'settings'}
                onClose={close}
                email={status?.email ?? ''}
                syncLabel={cloudSyncLabel(status) ?? 'Not signed in'}
                lastSyncedAt={status?.lastSyncedAt ?? null}
                pending={status?.pending ?? 0}
                onSignOut={() => void state.signOut()}
                passkeys={state.passkeys}
            />
            {state.report ? (
                <CloudSyncModal
                    isOpen={state.modal === 'conflicts'}
                    email={state.report.email}
                    summary={state.report}
                    conflicts={state.report.conflicts}
                    onCancel={() => void state.cancelCheck()}
                    onSync={state.resolve}
                />
            ) : null}
        </>
    );
};
