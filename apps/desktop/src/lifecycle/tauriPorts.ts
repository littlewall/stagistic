import {getUnsavedWorkParticipants, hasUnsavedWork} from '@stagistic/shared';
import {invoke} from '@tauri-apps/api/core';
import {check} from '@tauri-apps/plugin-updater';

import {syncToFs} from '../db';
import {writeBackup} from '../db/backups';
import type {
    DesktopControllerPorts,
    LeaveKind,
    SettleResult,
} from './desktopController';
import {DEFAULT_UPDATE_CHECK_TIMEOUT_MS as UPDATE_CHECK_TIMEOUT_MS, type UpdateControllerPorts} from './updateController';
import {NOTICE_URL, type UpdateNoticePorts} from './updateNotice';

/** Emitted by the Rust side when the window is closing or the app is quitting. */
export const SHUTDOWN_REQUESTED_EVENT = 'stagistic:shutdown-requested';

const SETTLE_POLL_MS = 50;

/*
 * Ask every enrolled owner to write its text, then wait until no owner still
 * marks unsaved work (debounced autosaves that were not enrolled settle on their own).
 * The controller's bound stops the wait.
 */
export const settleUnsavedWork = async (): Promise<SettleResult> => {
    const results = await Promise.all(getUnsavedWorkParticipants().map(participant => participant.flush().catch(() => false)));

    if (results.includes(false)) {
        return 'failed';
    }

    while (hasUnsavedWork()) {
        await new Promise(resolve => {
            setTimeout(resolve, SETTLE_POLL_MS);
        });
    }

    return 'saved';
};

/** Tells Rust whether the frontend can run the shutdown sequence; when it cannot, closing exits directly. */
export const setShutdownReady = (ready: boolean) => invoke('desktop_shutdown_ready', {ready});

export const createTauriPorts = (confirmQuitAnyway: (kind: LeaveKind) => Promise<boolean>): DesktopControllerPorts => ({
    settleUnsavedWork,
    hasUnsavedWork,
    flush: () => syncToFs(),
    writeBackup,
    exit: () => invoke('desktop_exit'),
    relaunch: () => invoke('desktop_relaunch'),
    confirmQuitAnyway,
    setTimer: (callback, ms) => setTimeout(callback, ms),
    clearTimer: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
    reportError: (message, error) => {
        console.error(message, error);
    },
});

export const createUpdatePorts = (): UpdateControllerPorts => ({
    checkForUpdate: async () => {
        const update = await check({timeout: UPDATE_CHECK_TIMEOUT_MS});

        if (!update) {
            return null;
        }

        // On macOS this replaces the app bundle on disk; the running code stays old until relaunch.
        return {release: update.version, install: () => update.downloadAndInstall()};
    },
    isOnline: () => navigator.onLine,
    now: () => new Date(),
    setTimer: (callback, ms) => setTimeout(callback, ms),
    clearTimer: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
    reportError: (message, error) => {
        console.error(message, error);
    },
});

/** Dev builds only: VITE_STAGISTIC_NOTICE_URL previews the bar (e.g. a file in apps/desktop/public). */
const noticeUrl = (): string => (import.meta.env.DEV
    ? (import.meta.env.VITE_STAGISTIC_NOTICE_URL as string | undefined) ?? NOTICE_URL
    : NOTICE_URL);

export const createNoticePorts = (): UpdateNoticePorts => ({
    fetchNotice: async () => {
        const response = await fetch(noticeUrl(), {cache: 'no-store'});

        if (!response.ok) {
            throw new Error(`Notice request failed: ${response.status}`);
        }

        return response.json() as Promise<unknown>;
    },
});
