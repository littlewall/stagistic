import {
    type ReactNode,
    useRef,
    useState,
} from 'react';

import {Button} from '../atoms/Button/Button';
import {ModalDialog} from '../dialogs/modal/ModalDialog';
import {PublicPreviewNotice} from '../dialogs/script/PublicPreviewNotice';
import styles from './AppFooter.module.css';

const FEEDBACK_URL = 'https://feedback.stagistic.com';

type AppFooterProps = {
    /** Centre slot, e.g. the editor's keyboard hints. Empty on other screens. */
    children?: ReactNode,
};

export const AppFooter = ({children}: AppFooterProps) => {
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const previewTrigger = useRef<HTMLButtonElement>(null);

    return (
        <>
            <footer className={styles.footer}>
                <span className={styles.start}>
                    💛 Stagistic Editor • Public preview (
                    <button
                        aria-label="What does public preview mean?"
                        className={styles.previewLink}
                        type="button"
                        ref={previewTrigger}
                        onClick={() => setIsPreviewDialogOpen(true)}
                    >
                        what does it mean?
                    </button>
                    )
                </span>
                <div className={styles.center}>{children}</div>
                <a
                    className={styles.feedbackLink}
                    href={FEEDBACK_URL}
                    rel="noopener noreferrer"
                    target="_blank"
                >
                    Feedback & bug reports
                </a>
            </footer>
            <ModalDialog
                ariaLabel="About the public preview"
                isOpen={isPreviewDialogOpen}
                returnFocus={previewTrigger}
                onClose={() => setIsPreviewDialogOpen(false)}
            >
                <PublicPreviewNotice />
                <div className={styles.modalActions}>
                    <Button
                        variant="secondary"
                        onPress={() => setIsPreviewDialogOpen(false)}
                    >
                        Close
                    </Button>
                </div>
            </ModalDialog>
        </>
    );
};
