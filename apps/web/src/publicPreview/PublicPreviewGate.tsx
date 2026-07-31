import {
    Button,
    ModalDialog,
    PublicPreviewNotice,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useState,
} from 'react';

import {
    hasCurrentPublicPreviewAcknowledgement,
    storeCurrentPublicPreviewAcknowledgement,
} from './publicPreviewAcknowledgement';
import styles from './PublicPreviewGate.module.css';

interface PublicPreviewGateProps {
    children: ReactNode,
}

const keepNoticeOpen = () => {};

export const PublicPreviewGate = ({children}: PublicPreviewGateProps) => {
    const [isAcknowledged, setIsAcknowledged] = useState(
        hasCurrentPublicPreviewAcknowledgement,
    );
    const acknowledge = useCallback(() => {
        storeCurrentPublicPreviewAcknowledgement();
        setIsAcknowledged(true);
    }, []);

    if (isAcknowledged) {
        return children;
    }

    return (
        <ModalDialog
            ariaLabel="Public preview notice"
            isOpen
            onClose={keepNoticeOpen}
        >
            <PublicPreviewNotice />
            <p className={styles.acknowledgement}>
                By continuing, you acknowledge these temporary limitations.
            </p>
            <div className={styles.actions}>
                <Button autoFocus onPress={acknowledge}>
                    I understand and continue
                </Button>
            </div>
        </ModalDialog>
    );
};
