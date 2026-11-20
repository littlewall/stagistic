/*
 * The key and value predate the notice's current wording. They stay so that writers who already
 * acknowledged it do not see it again; change the version only to show new copy to everyone.
 */
const BROWSER_NOTICE_ACKNOWLEDGEMENT_STORAGE_KEY = 'stagistic.web.publicPreviewAcknowledgement';
const CURRENT_BROWSER_NOTICE_ACKNOWLEDGEMENT_VERSION = '1';

const getBrowserStorage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export const hasCurrentBrowserNoticeAcknowledgement = (storage: Pick<Storage, 'getItem'> | null = getBrowserStorage()) => {
    if (!storage) {
        return false;
    }

    try {
        return storage.getItem(BROWSER_NOTICE_ACKNOWLEDGEMENT_STORAGE_KEY) === CURRENT_BROWSER_NOTICE_ACKNOWLEDGEMENT_VERSION;
    } catch {
        return false;
    }
};

export const storeCurrentBrowserNoticeAcknowledgement = (storage: Pick<Storage, 'setItem'> | null = getBrowserStorage()) => {
    if (!storage) {
        return false;
    }

    try {
        storage.setItem(BROWSER_NOTICE_ACKNOWLEDGEMENT_STORAGE_KEY, CURRENT_BROWSER_NOTICE_ACKNOWLEDGEMENT_VERSION);

        return true;
    } catch {
        return false;
    }
};
