import {currentReleaseNumber} from '@stagistic/release-notes/bundled';
import {ConfirmModal, LoaderOverlay} from '@stagistic/ui';
import {listen} from '@tauri-apps/api/event';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import {prepareManualMcp} from '../mcp/client';
import {reprepareManualMcpOnReleaseChange} from '../mcp/reprepareOnReleaseChange';
import {createDesktopController, type LeaveKind} from './desktopController';
import {
    createNoticePorts,
    createTauriPorts,
    createUpdatePorts,
    setShutdownReady,
    SHUTDOWN_REQUESTED_EVENT,
} from './tauriPorts';
import {createUpdateController, type UpdateCheckResult} from './updateController';
import {createUpdateNoticeController, type UpdateNoticeState} from './updateNotice';
import {UpdateResultDialog} from './UpdateResultDialog';
import type {DesktopUpdates} from './updatesContext';

// Turns the dialog buttons into the promise the controller awaits.
const createQuitPrompt = (setAsking: (kind: LeaveKind | null) => void) => {
    let pending: ((quit: boolean) => void) | null = null;

    return {
        ask: (kind: LeaveKind) => new Promise<boolean>(resolve => {
            pending = resolve;
            setAsking(kind);
        }),
        answer: (quit: boolean) => {
            pending?.(quit);
            pending = null;
            setAsking(null);
        },
    };
};

const SAVE_FAILED_COPY: Record<LeaveKind, {description: string, confirmLabel: string}> = {
    quit: {description: 'Quitting now may lose what you typed last.', confirmLabel: 'Quit anyway'},
    restart: {description: 'Restarting now may lose what you typed last.', confirmLabel: 'Restart anyway'},
};

const CLOSING_COPY: Record<LeaveKind, {label: string, message: string}> = {
    quit: {label: 'Saving your changes', message: 'Stagistic Editor closes as soon as your work is saved.'},
    restart: {label: 'Restarting Stagistic Editor', message: 'Your work is saved before the new Release opens.'},
};

/*
 * Runs the desktop controller while the database is usable. Returns the
 * dialogs to render and the update state and actions. Rust asks for shutdown
 * through an event and exits only when the controller calls back.
 */
export const useDesktopLifecycle = (isReady: boolean): {
    dialogs: ReactNode,
    updates: DesktopUpdates,
    notice: UpdateNoticeState,
    hideNotice: () => void,
} => {
    const [asking, setAsking] = useState<LeaveKind | null>(null);
    const isAsking = asking !== null;
    const [closing, setClosing] = useState<LeaveKind | null>(null);
    const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
    const [prompt] = useState(() => createQuitPrompt(setAsking));
    const [controller] = useState(() => createDesktopController(createTauriPorts(prompt.ask)));
    const [noticeController] = useState(() => createUpdateNoticeController(createNoticePorts(), currentReleaseNumber));
    const [updateController] = useState(() => createUpdateController(createUpdatePorts(), {
        requestRestart: () => controller.requestRestart(),
        onCheck: () => void noticeController.refresh(),
    }));
    const notice = useSyncExternalStore(noticeController.subscribe, noticeController.getState);
    const updateState = useSyncExternalStore(updateController.subscribe, updateController.getState);

    const leave = useCallback((kind: LeaveKind) => {
        if (controller.isShuttingDown()) {
            return;
        }

        setClosing(kind);
        void (kind === 'restart' ? updateController.restart() : controller.requestQuit()).then(outcome => {
            // Only a cancelled leave keeps the app running; every other outcome exits or relaunches.
            if (outcome === 'cancelled') {
                setClosing(null);
            }
        });
    }, [controller, updateController]);

    useEffect(() => {
        if (!isReady) {
            return undefined;
        }

        const unlisten = listen(SHUTDOWN_REQUESTED_EVENT, () => leave('quit'));

        void unlisten.then(() => setShutdownReady(true));

        return () => {
            void setShutdownReady(false);
            void unlisten.then(dispose => dispose());
        };
    }, [isReady, leave]);

    useEffect(() => (isReady ? updateController.start() : undefined), [isReady, updateController]);

    useEffect(() => {
        if (isReady) {
            void reprepareManualMcpOnReleaseChange(currentReleaseNumber, localStorage, prepareManualMcp);
        }
    }, [isReady]);

    const updates = useMemo<DesktopUpdates>(() => ({
        state: updateState,
        checkNow: updateController.checkNow,
        restart: () => leave('restart'),
        checkForUpdatesWithDialog: async () => {
            setUpdateResult(await updateController.checkNow());
        },
    }), [
        updateState,
        updateController,
        leave,
    ]);

    const dialogs = (
        <>
            {closing && !isAsking
                ? <LoaderOverlay variant="notice" label={CLOSING_COPY[closing].label} messages={[CLOSING_COPY[closing].message]} />
                : null}
            <UpdateResultDialog
                result={updateResult}
                currentRelease={currentReleaseNumber}
                onRestart={() => {
                    setUpdateResult(null);
                    updates.restart();
                }}
                onClose={() => setUpdateResult(null)}
            />
            <ConfirmModal
                isOpen={isAsking}
                ariaLabel="Latest changes could not be saved"
                title="Your latest changes could not be saved"
                description={SAVE_FAILED_COPY[asking ?? 'quit'].description}
                confirmLabel={SAVE_FAILED_COPY[asking ?? 'quit'].confirmLabel}
                onClose={() => prompt.answer(false)}
                onConfirm={() => prompt.answer(true)}
            />
        </>
    );

    return {
        dialogs,
        updates,
        notice,
        hideNotice: noticeController.hide,
    };
};
