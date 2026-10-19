import {useEffect, useState} from 'react';

interface BootProgress {
    progress: number,
    label: string,
}

interface AppBootstrapOptions<Services> {
    beforeDatabase?: () => Promise<void>,
    prepareDatabase: (onProgress: (update: BootProgress) => void) => Promise<void>,
    /** Loads the app's services (repository module) once the database is ready. */
    loadRepository: () => Promise<Services>,
}

/** Keep options stable so a render does not restart database initialization. */
export const useAppBootstrap = <Services>(options: AppBootstrapOptions<Services>) => {
    const [services, setServices] = useState<Services | null>(null);
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
        services,
        bootProgress,
        bootStatus,
    };
};
