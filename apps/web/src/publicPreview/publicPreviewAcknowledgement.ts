export const PUBLIC_PREVIEW_ACKNOWLEDGEMENT_STORAGE_KEY
    = 'stagistic.web.publicPreviewAcknowledgement';
export const CURRENT_PUBLIC_PREVIEW_ACKNOWLEDGEMENT_VERSION = '1';

const getBrowserStorage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

export const hasCurrentPublicPreviewAcknowledgement = (
    storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
) => {
    if (!storage) {
        return false;
    }

    try {
        return storage.getItem(PUBLIC_PREVIEW_ACKNOWLEDGEMENT_STORAGE_KEY)
            === CURRENT_PUBLIC_PREVIEW_ACKNOWLEDGEMENT_VERSION;
    } catch {
        return false;
    }
};

export const storeCurrentPublicPreviewAcknowledgement = (
    storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
) => {
    if (!storage) {
        return false;
    }

    try {
        storage.setItem(
            PUBLIC_PREVIEW_ACKNOWLEDGEMENT_STORAGE_KEY,
            CURRENT_PUBLIC_PREVIEW_ACKNOWLEDGEMENT_VERSION,
        );

        return true;
    } catch {
        return false;
    }
};
