import {useState} from 'react';

import {Button} from '../atoms/Button';
import {ModalDialog} from '../dialogs/ModalDialog';
import {PublicPreviewNotice} from '../dialogs/PublicPreviewNotice';
import styles from './AppFooter.module.css';

export const AppFooter = () => {
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

    return (
        <>
            <footer className={styles.footer}>
                <span>© Stagistic Editor • Made with 💛 in Prague</span>
                <span className={styles.previewStatus}>
                    Public preview (
                    <Button
                        aria-label="What does public preview mean?"
                        className={styles.previewLink}
                        size="icon"
                        variant="ghost"
                        onPress={() => setIsPreviewDialogOpen(true)}
                    >
                        what does it mean?
                    </Button>
                    )
                </span>
                <a className={styles.feedbackLink} href="mailto:feedback@stagistic.com">
                    feedback@stagistic.com
                </a>
            </footer>
            <ModalDialog
                ariaLabel="About the public preview"
                isOpen={isPreviewDialogOpen}
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
