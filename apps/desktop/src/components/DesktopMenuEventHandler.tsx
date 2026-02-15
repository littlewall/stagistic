import {
    listenTauriMenuAction,
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '@stagistic/platform-core';
import {
    useCallback,
    useEffect,
} from 'react';
import {useNavigate} from 'react-router-dom';

const dispatchWindowEvent = (eventName: string) => {
    window.dispatchEvent(new CustomEvent(eventName));
};

export const DesktopMenuEventHandler = () => {
    const navigate = useNavigate();

    const handleMenuAction = useCallback((payload: string) => {
        switch (payload) {
            case 'open-script':
                void navigate('/script/list');
                break;
            case 'new-script':
                dispatchWindowEvent(MENU_EVENT_NEW_SCRIPT);
                break;
            case 'import-script':
                dispatchWindowEvent(MENU_EVENT_IMPORT_SCRIPT);
                break;
            default:
                break;
        }
    }, [navigate]);

    useEffect(() => {
        let unlisten: (() => void) | null = null;
        let disposed = false;

        const setup = async () => {
            try {
                const stop = await listenTauriMenuAction(handleMenuAction);

                if (!stop || disposed) {
                    stop?.();

                    return;
                }

                unlisten = stop;
            } catch (error) {
                console.error('Failed to listen to menu events', error);
            }
        };

        void setup();

        return () => {
            disposed = true;
            unlisten?.();
        };
    }, [handleMenuAction]);

    return null;
};
