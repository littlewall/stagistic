import {
    dismissRuntimeFileFailure,
    getRuntimeFileFailure,
    isDynamicImportFailure,
    reportRuntimeFileFailure,
    subscribeRuntimeFileFailure,
} from '@stagistic/app-core';
import {
    Button,
    ModalActions,
    ModalDialog,
    ModalHeader,
} from '@stagistic/ui';
import {useEffect, useSyncExternalStore} from 'react';

import {reloadPage} from '../shared/reloadPage';

const TITLE = 'Stagistic needs a reload';
const DESCRIPTION = 'A file of this Release is no longer available, most likely because Stagistic was updated. '
    + 'Reload to get the latest Release. Nothing is reloaded until you choose.';

/**
 * Asks for a reload when a file this build loads late is gone, which is what a deploy does to an
 * open tab. Reporters call `reportRuntimeFileFailure`; chunk preloads and uncaught dynamic imports
 * are caught here. Nothing reloads by itself: the writer decides, and the browser still asks
 * before leaving a page with unsaved text.
 */
export const RuntimeFileFailurePrompt = ({reload = reloadPage}: {reload?: () => void}) => {
    const failure = useSyncExternalStore(subscribeRuntimeFileFailure, getRuntimeFileFailure, () => null);

    useEffect(() => {
        const handlePreloadError = () => reportRuntimeFileFailure('Part of Stagistic could not be loaded.');
        const handleRejection = (event: PromiseRejectionEvent) => {
            if (isDynamicImportFailure(event.reason)) {
                reportRuntimeFileFailure('Part of Stagistic could not be loaded.');
            }
        };

        // Not prevented: the failing import still rejects for whoever started it.
        window.addEventListener('vite:preloadError', handlePreloadError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('vite:preloadError', handlePreloadError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    if (failure === null) {
        return null;
    }

    return (
        <ModalDialog ariaLabel={TITLE} isOpen onClose={dismissRuntimeFileFailure}>
            <ModalHeader
                title={TITLE}
                description={`${failure} ${DESCRIPTION}`}
            />
            <ModalActions spacing="lg">
                <Button data-modal-initial-focus onPress={reload}>Reload</Button>
                <Button variant="ghost" onPress={dismissRuntimeFileFailure}>Not now</Button>
            </ModalActions>
        </ModalDialog>
    );
};
