export const PRERELEASE_ACKNOWLEDGEMENT_STORAGE_KEY
    = 'stagistic.web.prereleaseAcknowledgement';
export const CURRENT_PRERELEASE_ACKNOWLEDGEMENT_VERSION = '1';

const getBrowserStorage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export const hasCurrentPrereleaseAcknowledgement = (
    storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
) => {
    if (!storage) {
        return false;
    }

    try {
        return storage.getItem(PRERELEASE_ACKNOWLEDGEMENT_STORAGE_KEY)
            === CURRENT_PRERELEASE_ACKNOWLEDGEMENT_VERSION;
    } catch {
        return false;
    }
};

export const storeCurrentPrereleaseAcknowledgement = (
    storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
) => {
    if (!storage) {
        return false;
    }

    try {
        storage.setItem(
            PRERELEASE_ACKNOWLEDGEMENT_STORAGE_KEY,
            CURRENT_PRERELEASE_ACKNOWLEDGEMENT_VERSION,
        );

        return true;
    } catch {
        return false;
    }
};
