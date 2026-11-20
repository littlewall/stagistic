import {Button} from '@stagistic/ui';

import styles from '../ScriptWorkspaceRoute.module.css';

/**
 * Shown when the script text could not be read. No editor is offered, so
 * nothing can be saved over the stored text until a load succeeds.
 */
export const ScriptLoadFailure = ({onRetry}: {onRetry: () => void}) => (
    <div className={styles.message} role="alert">
        <p>This script could not be loaded. Your text is untouched.</p>
        <Button variant="secondary" onPress={onRetry}>Try again</Button>
    </div>
);
