import {
    useEffect,
    useState,
} from 'react';

import {
    type DbBootstrapUpdate,
    prepareLocalDbWithProgress,
} from '~db';

type DesktopBootstrapState = {
    bootProgress: number,
    bootError: string | null,
    bootReady: boolean,
    bootStatus: string,
};

const waitForFonts = async () => {
    if (typeof document === 'undefined' || !document.fonts) {
        return;
    }

    await document.fonts.ready;
};

export const useDesktopBootstrap = (): DesktopBootstrapState => {
    const [bootProgress, setBootProgress] = useState(0);
    const [bootError, setBootError] = useState<string | null>(null);
    const [bootReady, setBootReady] = useState(false);
    const [bootStatus, setBootStatus] = useState('Připravuji aplikaci');

    useEffect(() => {
        let isActive = true;

        const handleProgressUpdate = (update: DbBootstrapUpdate) => {
            if (!isActive) {
                return;
            }

            setBootStatus(update.label);
            setBootProgress(0.15 + update.progress * 0.85);
        };

        const boot = async () => {
            try {
                setBootStatus('Načítám UI assety');
                setBootProgress(0.15);

                await Promise.all([waitForFonts(), prepareLocalDbWithProgress(handleProgressUpdate)]);

                if (!isActive) {
                    return;
                }

                setBootProgress(1);
                setBootStatus('Hotovo');
                setBootReady(true);
            } catch (error) {
                console.error('Failed to initialize app', error);

                if (isActive) {
                    setBootError('Nepodařilo se inicializovat aplikaci.');
                }
            }
        };

        void boot();

        return () => {
            isActive = false;
        };
    }, []);

    return {
        bootProgress,
        bootError,
        bootReady,
        bootStatus,
    };
};
