import {
    Button,
    ModalDialog,
    PrereleaseNotice,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useState,
} from 'react';

import {
    hasCurrentPrereleaseAcknowledgement,
    storeCurrentPrereleaseAcknowledgement,
} from './acknowledgement';
import styles from './PrereleaseGate.module.css';

interface PrereleaseGateProps {
    children: ReactNode,
}

const keepNoticeOpen = () => {};

export const PrereleaseGate = ({children}: PrereleaseGateProps) => {
    const [isAcknowledged, setIsAcknowledged] = useState(
        hasCurrentPrereleaseAcknowledgement,
    );
    const acknowledge = useCallback(() => {
        storeCurrentPrereleaseAcknowledgement();
        setIsAcknowledged(true);
    }, []);

    if (isAcknowledged) {
        return children;
    }

    return (
        <ModalDialog
            ariaLabel="Pre-release notice"
            isOpen
            onClose={keepNoticeOpen}
        >
            <PrereleaseNotice />
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
