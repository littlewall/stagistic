import {Button} from '@stagistic/ui';

import styles from './DraftSaveError.module.css';

interface DraftSaveErrorProps {
    error: Error | null,
    onRetry: () => void,
}

export const DraftSaveError = ({
    error,
    onRetry,
}: DraftSaveErrorProps) => {
    if (!error) {
        return null;
    }

    return (
        <div className={styles.error} role="alert">
            <span>Changes could not be saved.</span>
            <Button
                size="sm"
                variant="secondary"
                onPress={onRetry}
            >Retry
            </Button>
        </div>
    );
};
