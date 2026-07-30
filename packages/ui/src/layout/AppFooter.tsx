import {useState} from 'react';

import {Button} from '../atoms/Button';
import {ModalDialog} from '../dialogs/ModalDialog';
import {PrereleaseNotice} from '../dialogs/PrereleaseNotice';
import styles from './AppFooter.module.css';

export const AppFooter = () => {
    const [isAlphaDialogOpen, setIsAlphaDialogOpen] = useState(false);

    return (
        <>
            <footer className={styles.footer}>
                <span>© Stagistic Editor • Made with 💛 in Prague</span>
                <span className={styles.alphaStatus}>
                    Alpha pre-release (
                    <Button
                        aria-label="What does Alpha pre-release mean?"
                        className={styles.alphaLink}
                        size="icon"
                        variant="ghost"
                        onPress={() => setIsAlphaDialogOpen(true)}
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
                ariaLabel="About the Alpha pre-release"
                isOpen={isAlphaDialogOpen}
                onClose={() => setIsAlphaDialogOpen(false)}
            >
                <PrereleaseNotice />
                <div className={styles.modalActions}>
                    <Button
                        variant="secondary"
                        onPress={() => setIsAlphaDialogOpen(false)}
                    >
                        Close
                    </Button>
                </div>
            </ModalDialog>
        </>
    );
};
