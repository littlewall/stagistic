import type {SyncEngineClient} from '@stagistic/sync-engine';
import {useEffect, useState} from 'react';

interface BootProgress {
    progress: number,
    label: string,
}

interface AppServices<Repository> {
    scriptRepository: Repository,
    documentSync: SyncEngineClient,
}

interface AppBootstrapOptions<Repository> {
    beforeDatabase?: () => Promise<void>,
    prepareDatabase: (onProgress: (update: BootProgress) => void) => Promise<void>,
    loadRepository: () => Promise<AppServices<Repository>>,
}

/** Keep options stable so a render does not restart database initialization. */
export const useAppBootstrap = <Repository>(options: AppBootstrapOptions<Repository>) => {
    const [services, setServices] = useState<AppServices<Repository> | null>(null);
    const [bootProgress, setBootProgress] = useState(0);
    const [bootStatus, setBootStatus] = useState('Preparing');

    useEffect(() => {
        let isActive = true;

        const boot = async () => {
            if (document.fonts) {
                await document.fonts.ready;
            }

            if (!isActive) {
                return;
            }

            if (options.beforeDatabase) {
                await options.beforeDatabase();
            }

            if (!isActive) {
                return;
            }

            await options.prepareDatabase(update => {
                if (isActive) {
                    setBootProgress(update.progress);
                    setBootStatus(update.label);
                }
            });

            if (!isActive) {
                return;
            }

            const repository = await options.loadRepository();

            if (isActive) {
                setServices(repository);
            }
        };

        void boot();

        return () => {
            isActive = false;
        };
    }, [options]);

    return {
        scriptRepository: services?.scriptRepository ?? null,
        documentSync: services?.documentSync ?? null,
        bootProgress,
        bootStatus,
    };
};
