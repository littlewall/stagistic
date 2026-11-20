import {
    BrowserDataNotice,
    Button,
    ModalDialog,
} from '@stagistic/ui';
import {
    type ReactNode,
    useCallback,
    useState,
} from 'react';

import {
    hasCurrentBrowserNoticeAcknowledgement,
    storeCurrentBrowserNoticeAcknowledgement,
} from './browserNoticeAcknowledgement';
import styles from './BrowserNoticeGate.module.css';

interface BrowserNoticeGateProps {
    children: ReactNode,
}

const keepNoticeOpen = () => {};

/** First-visit notice. Writers read it again under Storage in the app settings. */
export const BrowserNoticeGate = ({children}: BrowserNoticeGateProps) => {
    const [isAcknowledged, setIsAcknowledged] = useState(
        hasCurrentBrowserNoticeAcknowledgement,
    );
    const acknowledge = useCallback(() => {
        storeCurrentBrowserNoticeAcknowledgement();
        setIsAcknowledged(true);
    }, []);

    if (!isAcknowledged) {
        return (
            <ModalDialog
                ariaLabel="Your scripts live in this browser"
                isOpen
                onClose={keepNoticeOpen}
            >
                <BrowserDataNotice />
                <div className={styles.actions}>
                    <Button data-modal-initial-focus onPress={acknowledge}>
                        Continue
                    </Button>
                </div>
            </ModalDialog>
        );
    }

    return children;
};
