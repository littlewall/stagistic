/*
 * Manual update notice. stagistic.com serves /desktop/notice.json; when the
 * running Release is older than `minimumRelease`, the app shows a bar asking
 * for a manual download. Fetched with every update check, independent of the
 * updater. Anything that is not the expected JSON is ignored.
 */
import {compareReleaseNumbers, isReleaseNumber} from '@stagistic/release-notes';

export const NOTICE_URL = 'https://stagistic.com/desktop/notice.json';
export const DOWNLOAD_URL = 'https://stagistic.com/download';
export const DEFAULT_NOTICE_MESSAGE = 'This Release can no longer update itself. Download the current Release.';

const TRUSTED_URL_PREFIX = 'https://stagistic.com/';

export interface UpdateNotice {
    minimumRelease: string,
    message: string,
    url: string,
}

const isTrustedUrl = (value: string): boolean => {
    try {
        const url = new URL(value);

        return value.startsWith(TRUSTED_URL_PREFIX) && url.origin === 'https://stagistic.com';
    } catch {
        return false;
    }
};

/** The validated notice, or null for anything that is not `{minimumRelease: x.y.z, message?, url?}`. */
export const parseUpdateNotice = (value: unknown): UpdateNotice | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return null;
    }

    const {
        minimumRelease,
        message,
        url,
    } = value as Record<string, unknown>;

    if (typeof minimumRelease !== 'string' || !isReleaseNumber(minimumRelease)) {
        return null;
    }

    return {
        minimumRelease,
        message: typeof message === 'string' && message.trim() ? message.trim() : DEFAULT_NOTICE_MESSAGE,
        url: typeof url === 'string' && isTrustedUrl(url) ? url : DOWNLOAD_URL,
    };
};

export interface UpdateNoticeState {
    notice: UpdateNotice | null,
    /** True while the running Release is older than the notice's minimum and not hidden. */
    visible: boolean,
}

export interface UpdateNoticePorts {
    /** Resolves the parsed JSON body; rejects on network, status or parse errors. */
    fetchNotice: () => Promise<unknown>,
}

export const createUpdateNoticeController = (ports: UpdateNoticePorts, runningRelease: string) => {
    const listeners = new Set<() => void>();
    let notice: UpdateNotice | null = null;
    let hidden = false;
    let state: UpdateNoticeState = {notice: null, visible: false};

    const publish = () => {
        const visible = !hidden && notice !== null && compareReleaseNumbers(runningRelease, notice.minimumRelease) < 0;

        if (visible === state.visible && notice === state.notice) {
            return;
        }

        state = {notice, visible};
        listeners.forEach(listener => listener());
    };

    return {
        getState: () => state,
        subscribe: (listener: () => void) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
        refresh: async (): Promise<void> => {
            try {
                const next = parseUpdateNotice(await ports.fetchNotice());

                if (next) {
                    notice = next;
                    publish();
                }
            } catch {
                // Offline, blocked or not JSON: keep the current state.
            }
        },
        /** Hides the bar until the next app start. */
        hide: () => {
            hidden = true;
            publish();
        },
    };
};

export type UpdateNoticeController = ReturnType<typeof createUpdateNoticeController>;
